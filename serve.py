#!/usr/bin/env python3

import guts
from twisted.web.static import File
import os
import csv
import tempfile
import requests
import subprocess
import json
import nmt
import numpy as np
import scipy.io as sio
import sys
import time
import argparse

import prosodic_measures
import secureroot

# specifies if we are releasing for MAC DMG
BUNDLE = False


def get_ffmpeg():
    if BUNDLE:
        return "./ffmpeg"
    return "ffmpeg"

if BUNDLE:
    nmt.FFMPEG = get_ffmpeg()

def get_local():
    if BUNDLE:
        return os.path.join(os.environ["HOME"], ".drift4", "local")
    return "local"


def get_attachpath():
    return os.path.join(get_local(), "_attachments")


def get_calc_sbpca():
    if BUNDLE:
        return "./sacc/SAcC"
    return "./ext/calc_sbpca/python/SAcC.py"

parser = argparse.ArgumentParser(description = "Drift4")
parser.add_argument("port", help="specify port to serve Drift from; default: 9899", nargs='?', type=int, default=9899)
parser.add_argument("-s", "--ssl", help="specify ssl certificates to use to allow secure websockets", nargs=2, metavar=('privateKeyFileName', 'certificateFileName'))

driftargs = parser.parse_args()

port = driftargs.port
root = guts.Root(port=port, interface="0.0.0.0", dirpath="www") if not (driftargs.ssl) \
    else secureroot.SecureRoot(port=port, interface="0.0.0.0", dirpath="www", key_path=driftargs.ssl[0], crt_path=driftargs.ssl[1])

db = guts.Babysteps(os.path.join(get_local(), "db"))

rec_set = guts.BSFamily("recording", localbase=get_local())
root.putChild(b"_rec", rec_set.res)

def pitch(cmd):
    docid = cmd["id"]

    meta = rec_set.get_meta(docid)

    # Create an 8khz wav file
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav_fp:
        subprocess.call(
            [
                get_ffmpeg(),
                "-y",
                "-loglevel",
                "panic",
                "-i",
                os.path.join(get_attachpath(), meta["path"]),
                "-ar",
                "8000",
                "-ac",
                "1",
                wav_fp.name,
            ]
        )

        # ...and use it to compute pitch
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as pitch_fp:
            subprocess.call([get_calc_sbpca(), wav_fp.name, pitch_fp.name])

    if len(open(pitch_fp.name).read().strip()) == 0:
        return {"error": "Pitch computation failed"}

    # XXX: frozen attachdir
    pitchhash = guts.attach(pitch_fp.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[docid],
        {"type": "set", "id": "meta", "key": "pitch", "val": pitchhash},
    )

    return {"pitch": pitchhash}


root.putChild(b"_pitch", guts.PostJson(pitch, runasync=True))


def parse_speakers_in_transcript(trans):
    segs = []

    cur_speaker = None
    for line in trans.split("\n"):
        if (
            ":" in line
            and line.index(":") < 32
            and len(line.split(":")[0].split(" ")) < 3
        ):
            cur_speaker = line.split(":")[0]
            line = ":".join(line.split(":")[1:])

        line = line.strip()
        if len(line) > 0:
            segs.append({"speaker": cur_speaker, "line": line})

    return segs


def gentle_punctuate(wdlist, transcript):
    # Use the punctuation from Gentle's transcript in a wdlist
    out = []

    last_word_end = None
    next_aligned_wd = None

    for wd_idx, wd in enumerate(wdlist):
        next_wd_idx = wd_idx + 1
        next_wd = None

        is_aligned = wd.get("end") is not None

        while next_wd_idx < len(wdlist):
            next_wd = wdlist[next_wd_idx]
            if next_wd.get("startOffset") is not None:
                break
            next_wd_idx += 1

        if not is_aligned:
            next_wd_idx = wd_idx + 1
            while next_wd_idx < len(wdlist):
                next_aligned_wd = wdlist[next_wd_idx]
                if next_aligned_wd.get("end") is not None:
                    break
                else:
                    next_aligned_wd = None
                next_wd_idx += 1

        if next_wd is None or next_wd.get("startOffset") is None:
            # No next word - don't glob punctuation, just return what we have.

            keys = ["start", "end", "phones"]

            wd_obj = {"word": wd["word"]}
            for key in keys:
                if key in wd:
                    wd_obj[key] = wd[key]

            out.append(wd_obj)
            break

        if "startOffset" not in wd:  # or 'startOffset' not in next_wd:
            continue
        if wd.get("startOffset") is not None:
            wd_str = transcript[wd["startOffset"] : next_wd["startOffset"]]

            keys = ["start", "end", "phones"]

            wd_obj = {"word": wd_str}
            for key in keys:
                if key in wd:
                    wd_obj[key] = wd[key]

            out.append(wd_obj)

    return gaps_and_unaligned(out)


def gaps_and_unaligned(seq):
    out = []

    cur_unaligned = []
    last_end = 0

    for idx, wd in enumerate(seq):
        if wd.get("end"):
            if len(cur_unaligned) > 0:
                # End of an unaligned block
                out.append(
                    {
                        "type": "unaligned",
                        "start": last_end,
                        "end": wd["start"],
                        "word": "".join([X["word"] for X in cur_unaligned]),
                    }
                )

                cur_unaligned = []

            if len(out) > 0 and out[-1]["end"] < wd["start"]:
                # gap
                out.append(
                    {
                        "type": "gap",
                        "start": last_end,
                        "end": wd["start"],
                        "word": "[gap]",
                    }
                )

            out.append(wd)
            last_end = wd["end"]
        else:
            # unaligned
            cur_unaligned.append(wd)

    if len(cur_unaligned) > 0:
        # End of an unaligned block
        out.append(
            {
                "type": "unaligned",
                "start": last_end,
                "word": "[%s]" % ("".join([X["word"] for X in cur_unaligned])),
            }
        )

    return out


def align(cmd):
    meta = rec_set.get_meta(cmd["id"])

    media = os.path.join(get_attachpath(), meta["path"])
    segs = parse_speakers_in_transcript(
        open(os.path.join(get_attachpath(), meta["transcript"])).read()
    )

    tscript_txt = "\n".join([X["line"] for X in segs])
    url = "http://localhost:8765/transcriptions"

    res = requests.post(url,
                        data={"transcript": tscript_txt},
                        files={'audio':
                               ('audio', open(media, 'rb'))})

    # Find the ID
    uid = res.history[0].headers['Location'].split('/')[-1]

    # Poll for status
    status_url = url + '/' + uid + '/status.json'

    cur_status = -1

    while True:
        status = requests.get(status_url).json()
        if status.get('status') != 'OK':
            s = status.get('percent', 0)
            if s > cur_status:
                cur_status = s

                guts.bschange(
                    rec_set.dbs[cmd["id"]],
                    {"type": "set", "id": "meta", "key": "align_px", "val": cur_status})

            time.sleep(1)

        else:
            # transcription done
            break

    align_url = url + '/' + uid + '/align.json'
    trans = requests.get(align_url).json()

    # Re-diarize Gentle output into a sane diarization format
    diary = {"segments": [{}]}
    seg = diary["segments"][0]
    seg["speaker"] = segs[0]["speaker"]

    wdlist = []
    end_offset = 0
    seg_idx = 0

    cur_end = 0

    for wd in trans["words"]:
        gap = trans["transcript"][end_offset : wd["startOffset"]]
        seg_idx += len(gap.split("\n")) - 1

        if "\n" in gap and len(wdlist) > 0:
            # Linebreak - new segment!
            wdlist[-1]["word"] += gap.split("\n")[0]

            seg["wdlist"] = gentle_punctuate(wdlist, trans["transcript"])

            # Compute start & end
            seg["start"] = seg["wdlist"][0].get("start", cur_end)
            has_end = [X for X in seg["wdlist"] if X.get("end")]
            if len(has_end) > 0:
                seg["end"] = has_end[-1]["end"]
            else:
                seg["end"] = cur_end
            cur_end = seg["end"]

            wdlist = []
            seg = {}
            diary["segments"].append(seg)
            if len(segs) > seg_idx:
                seg["speaker"] = segs[seg_idx]["speaker"]

        wdlist.append(wd)
        end_offset = wd["endOffset"]

    seg["wdlist"] = gentle_punctuate(wdlist, trans["transcript"])

    # Compute start & end
    seg["start"] = seg["wdlist"][0].get("start", cur_end)
    has_end = [X for X in seg["wdlist"] if X.get("end")]
    if len(has_end) > 0:
        seg["end"] = has_end[-1]["end"]
    else:
        seg["end"] = cur_end

    # For now, hit disk. Later we can explore the transcription DB.
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as dfh:
        json.dump(diary, dfh, indent=2)

        dfh.close()
    alignhash = guts.attach(dfh.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[cmd["id"]],
        {"type": "set", "id": "meta", "key": "align", "val": alignhash},
    )
    
    # https://stackoverflow.com/questions/45978295/saving-a-downloaded-csv-file-using-python
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as fp:
        w = csv.writer(fp)
        aligncsv_url = url + '/' + uid + '/align.csv'
        aligncsv = requests.get(aligncsv_url)
        for line in aligncsv.iter_lines():
            w.writerow(line.decode('utf-8').split(','))
        fp.close()
    aligncsvhash = guts.attach(fp.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[cmd["id"]],
        {"type": "set", "id": "meta", "key": "aligncsv", "val": aligncsvhash},
    )

    return {"align": alignhash}


root.putChild(b"_align", guts.PostJson(align, runasync=True))


def gen_csv(cmd):
    docid = cmd["id"]
    meta = rec_set.get_meta(docid)

    p_path = os.path.join(get_attachpath(), meta["pitch"])
    pitch = [float(X.split()[1]) for X in open(p_path) if len(X.split()) > 2]

    a_path = os.path.join(get_attachpath(), meta["align"])
    align = json.load(open(a_path))

    words = []
    for seg in align["segments"]:
        for wd in seg["wdlist"]:
            wd_p = dict(wd)
            wd_p["speaker"] = seg["speaker"]
            words.append(wd_p)

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as fp:
        w = csv.writer(fp)

        w.writerow(["time (s)", "pitch (hz)", "word", "phoneme", "speaker"])

        for idx, pitch_val in enumerate(pitch):
            t = idx / 100.0

            wd_txt = None
            ph_txt = None
            speaker = None

            for wd_idx, wd in enumerate(words):
                if wd.get("start") is None or wd.get("end") is None:
                    continue

                if wd["start"] <= t and wd["end"] >= t:
                    wd_txt = wd["word"].encode("utf-8")

                    speaker = wd["speaker"]

                    # find phone
                    cur_t = wd["start"]
                    for phone in wd.get("phones", []):
                        if cur_t + phone["duration"] >= t:
                            ph_txt = phone["phone"]
                            break
                        cur_t += phone["duration"]

                    break

            if type(wd_txt) == bytes:
                wd_txt = wd_txt.decode("utf-8")
            elif type(wd_txt) != str:
                wd_txt = str(wd_txt or "")

            row = [t, pitch_val, wd_txt, ph_txt, speaker]
            w.writerow(row)

        fp.flush()

    csvhash = guts.attach(fp.name, get_attachpath())
    guts.bschange(
        rec_set.dbs[cmd["id"]],
        {"type": "set", "id": "meta", "key": "csv", "val": csvhash},
    )

    return {"csv": csvhash}


root.putChild(b"_csv", guts.PostJson(gen_csv, runasync=True))


def rms(cmd):
    docid = cmd["id"]
    info = rec_set.get_meta(docid)

    vpath = os.path.join(get_attachpath(), info["path"])

    R = 44100

    snd = nmt.sound2np(vpath, R=R, nchannels=1, ffopts=["-filter:a", "dynaudnorm"])

    WIN_LEN = int(R / 100)

    rms = []
    for idx in range(int(len(snd) / WIN_LEN)):
        chunk = snd[idx * WIN_LEN : (idx + 1) * WIN_LEN]
        rms.append((chunk.astype(float) ** 2).sum() / len(chunk))
    rms = np.array(rms)

    rms -= rms.min()
    rms /= rms.max()

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as fh:
        json.dump(rms.tolist(), fh)
        fh.close()

    rmshash = guts.attach(fh.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[docid], {"type": "set", "id": "meta", "key": "rms", "val": rmshash}
    )

    return {"rms": rmshash}


def gen_mat(cmd):
    id = cmd["id"]
    # Hm!
    meta = rec_set.get_meta(id)

    out = {}

    measure = _measure(id, raw=True)

    out.update(measure["measure"])
    # out.update(measure["raw"])

    if meta.get("rms"):
        out["rms"] = np.array(
            json.load(open(os.path.join(get_attachpath(), meta["rms"])))
        )
    if meta.get("pitch"):
        p_path = os.path.join(get_attachpath(), meta["pitch"])
        out["pitch"] = np.array(
            [float(X.split()[1]) for X in open(p_path) if len(X.split()) > 2]
        )
    if meta.get("align"):
        a_path = os.path.join(get_attachpath(), meta["align"])
        out["align"] = json.load(open(a_path))
        # Remove 'None' values
        for seg in out['align']['segments']:
            for k,v in list(seg.items()):
                if v is None:
                    del seg[k]

    with tempfile.NamedTemporaryFile(suffix=".mat", delete=False) as mf:
        sio.savemat(mf.name, out)

        mathash = guts.attach(mf.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[id], {"type": "set", "id": "meta", "key": "mat", "val": mathash}
    )
    
    return {"mat": mathash}


root.putChild(b"_mat", guts.PostJson(gen_mat, runasync=True))


def _measure(id=None, start_time=None, end_time=None, full_ts=False, raw=False):

    if start_time is not None:
        start_time = float(start_time)
    if end_time is not None:
        end_time = float(end_time)

    meta = rec_set.get_meta(id)

    # full transcription duration should be the same for any given document,
    # prosodic measures for these are cached so we can bulk download them.
    if full_ts and meta.get("full_ts"):
        return json.load(open(os.path.join(get_attachpath(), meta["full_ts"])))

    pitch = [
        [float(Y) for Y in X.split(" ")]
        for X in open(os.path.join(get_attachpath(), meta["pitch"]))
    ]

    if not meta.get("csv"):
        gen_csv({ "id": id })

    while not rec_set.get_meta(id).get("csv"):
        pass

    meta = rec_set.get_meta(id)
    driftcsv = open(os.path.join(get_attachpath(), meta["csv"]))
    gentlecsv = open(os.path.join(get_attachpath(), meta["aligncsv"]))

    pm_data = prosodic_measures.measure(gentlecsv, driftcsv, start_time, end_time)

    st = start_time if start_time is not None else 0
    full_data = {
        "measure": {
            "start_time": st,
            "end_time": end_time if end_time is not None else ((len(pitch) / 100.0) - st)
        }
    }
    
    full_data["measure"].update(pm_data)

    if full_ts:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as dfh:
            json.dump(full_data, dfh, indent=2)

            dfh.close()
        fulltshash = guts.attach(dfh.name, get_attachpath())

        guts.bschange(
            rec_set.dbs[id],
            {"type": "set", "id": "meta", "key": "full_ts", "val": fulltshash},
        )

    return full_data

root.putChild(b"_measure", guts.GetArgs(_measure, runasync=True))

root.putChild(b"_rms", guts.PostJson(rms, runasync=True))

root.putChild(b"_db", db)
root.putChild(b"_attach", guts.Attachments(get_attachpath()))

# this has not been necessary anymore since a port number was not needed to access endpoints
# but I'll keep it in in case one needs the functionality (see also script.js:0)
if not BUNDLE:
    with open("www/web-script.js", mode="w") as final_script_js, \
        open("www-template/web-script.template.js", mode="r") as template_script_js:
        final_script_js.write(template_script_js.read().replace("$PORTVAR", str(port)))
        
    
root.putChild(b"_stage", guts.Codestage(wwwdir="www"))

root.putChild(b"media", File(get_attachpath()))

guts.serve("stage.py", globals(), root=root)