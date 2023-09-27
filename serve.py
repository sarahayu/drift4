#!/usr/bin/env python3

import argparse

parser = argparse.ArgumentParser(description = "Drift4")
parser.add_argument("port", help="specify port to serve Drift from; default: 9899", nargs='?', type=int, default=9899)
parser.add_argument("-g", "--gentle_port", help="specify port Drift should find Gentle on. default: 8765. note this value can be changed later through GUI settings", type=int, default=8765)
parser.add_argument("-c", "--calc_intense", help="allow for more intensive Voxit calculations, disabled by default. note this value can be changed later through GUI settings", action='store_true')
parser.add_argument("-w", "--web", help="enable if hosting Drift as a website. This option disables changing of settings through web interface", action='store_true')

driftargs = parser.parse_args()

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
import pyworld
import librosa
import signal

from py import prosodic_measures
import secureroot
from dotenv import load_dotenv
from twisted.internet import reactor

load_dotenv()

# specifies if we are releasing for MAC DMG
BUNDLE = hasattr(sys, "frozen")

WEBSERVE = driftargs.web
GENTLE_PORT = driftargs.gentle_port

# add current directory to path so audioread (used by librosa) and nmt can use ffmpeg without prepending './'
# I know nmt has the option to change how one calls ffmpeg, but audioread does not appear to have it
os.environ["PATH"] += os.pathsep + '.'

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
    # return "./py/py2/sacc_cli.py"


def get_open_port(desired=0):
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("",desired))
    except socket.error:
        return get_open_port(0)
    s.listen(1)
    port = s.getsockname()[1]
    s.close()
    return port

def start_gentle(desired):
    port = get_open_port(desired)
    # can't use threading library because gentle uses reactor, but so does drift, and reactor throws error on multiple instances
    proc = subprocess.Popen([sys.executable, 'serve_gentle.py', '--port', str(port)])

    return port, proc

port = driftargs.port
root = secureroot.FolderlessRoot(port=port, interface="0.0.0.0", dirpath="www") if not (os.getenv("PRIVATE_KEY_FILENAME") and os.getenv("CERT_FILENAME")) \
    else secureroot.SecureRoot(port=port, interface="0.0.0.0", dirpath="www", key_path=os.getenv("PRIVATE_KEY_FILENAME"), crt_path=os.getenv("CERT_FILENAME"))

calc_intense = driftargs.calc_intense
print(f"SYSTEM: CALC_INTENSE is { calc_intense }")
print(f"SYSTEM: GENTLE_PORT is { GENTLE_PORT }")
print(f"SYSTEM: WEBSERVE is { WEBSERVE }")

GENTLE_PORT, gentle_proc = start_gentle(GENTLE_PORT)
print(f"Starting Gentle on port {GENTLE_PORT} (this might different than GENTLE_PORT that was passed in)")

db = guts.Babysteps(os.path.join(get_local(), "db"))

rec_set = guts.BSFamily("recording", localbase=get_local())
root.putChild(b"_rec", rec_set.res)

def pitch(cmd):
    docid = cmd["id"]

    meta = rec_set.get_meta(docid)

    # Create an 8khz wav file
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav_fp:
        ff_start = time.time()
        subprocess.call(
            [
                "ffmpeg",
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

        print(f'SYSTEM: FFMPEG took {time.time() - ff_start:.2f}s')

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

def _harvest(cmd):
    if not calc_intense:
        return { }
    
    docid = cmd["id"]

    meta = rec_set.get_meta(docid)

    x, fs = librosa.load(os.path.join(get_attachpath(), meta["path"]), sr=None)
    print("SYSTEM: harvesting...")
    hv_start = time.time()
    f0, timeaxis = pyworld.harvest(x.astype(np.float64), fs)
    print(f"SYSTEM: finished harvesting! (took {time.time() - hv_start:.2f}s)")

    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w") as harvest_fp:
        for i in range(len(timeaxis)):
            harvest_fp.write(f'{timeaxis[i]} {f0[i]}\n')

    if len(open(harvest_fp.name).read().strip()) == 0:
        return {"error": "Harvest computation failed"}

    # XXX: frozen attachdir
    harvesthash = guts.attach(harvest_fp.name, get_attachpath())

    guts.bschange(
        rec_set.dbs[docid],
        {"type": "set", "id": "meta", "key": "harvest", "val": harvesthash},
    )

    return {"harvest": harvesthash}

def save_audio_info(cmd):
    docid = cmd["id"]

    meta = rec_set.get_meta(docid)

    if os.path.getsize(os.path.join(get_attachpath(), meta["path"])) > 10e6:
        duration = sys.maxsize
    else:
        x, fs = librosa.load(os.path.join(get_attachpath(), meta["path"]), sr=None)
        duration = librosa.get_duration(y=x, sr=fs)

    guts.bschange(
        rec_set.dbs[docid],
        {"type": "set", "id": "meta", "key": "info", "val": duration},
    )

    return {"info": duration}


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
    url = f"http://localhost:{GENTLE_PORT}/transcriptions"

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

def _settings(cmd):
    global GENTLE_PORT, calc_intense, WEBSERVE

    # if we're only querying settings and not changing them. idk if we can stack get+post requests in guts and i'm too lazy to check
    if "get_settings" in cmd or WEBSERVE:
        return { "changed": False, "calc_intense": calc_intense, "gentle_port": GENTLE_PORT }
    
    print(f"Settings before: GENTLE { GENTLE_PORT }, CALC_INTENSE { calc_intense }")

    GENTLE_PORT = int(cmd["gentle_port"])
    calc_intense = cmd["calc_intense"]
    
    print(f"After: GENTLE { GENTLE_PORT }, CALC_INTENSE { calc_intense }")
    
    return { "changed": True, "calc_intense": calc_intense, "gentle_port": GENTLE_PORT }

def measure(id, start_time, end_time, force_gen, raw):

    meta = rec_set.get_meta(id)

    ## --- check we have all needed data

    # redundacy, CSV did not load sometimes on older versions of Drift. Generate if nonexistent
    if not meta.get("csv"):
        gen_csv({ "id": id })

    # if not meta.get("info"):
    #     save_audio_info({ "id": id })

    # check, maybe Drift is now running on calc_intense mode even though it wasn't when the audio file was originally uploaded
    # Generate Harvest if nonexistent
    if calc_intense and not meta.get("harvest"):
        _harvest({ "id": id })

    # TODO will these hang? this is just to prevent concurrent calls to harvest/csv during their initialization throwing errors
    while not rec_set.get_meta(id).get("csv"):
        pass
    
    # while not rec_set.get_meta(id).get("info"):
    #     pass
    
    while calc_intense and not rec_set.get_meta(id).get("harvest"):
        pass
    
    # update meta with new meta that has all needed data
    meta = rec_set.get_meta(id)

    ## --- end check we have all needed data

    gentlecsv = open(os.path.join(get_attachpath(), meta["aligncsv"]))
    driftcsv = open(os.path.join(get_attachpath(), meta["csv"]))    

    # set start/end to transcript start/end if they're None
    if start_time is None or end_time is None:
        start_time, end_time = prosodic_measures.get_transcript_start_end(gentlecsv)
        gentlecsv.seek(0)
        full_ts = True
    else:
        full_ts = False

    # full transcription duration should be the same for any given document,
    # prosodic measures for these are cached so we can bulk download them.
    if full_ts and not force_gen and meta.get("full_ts"):
        cached = json.load(open(os.path.join(get_attachpath(), meta["full_ts"])))

        # if dynamism is part of cached data, return it. otherwise, it is outdated and must be reloaded
        if 'Dynamism' in cached['measure'] or not calc_intense:

            # remove intense measures if we're on not calc_intense mode
            if not calc_intense:
                dummy_measures = prosodic_measures.measure_gentle_drift(gentlecsv, driftcsv, 0, 1)
                gentlecsv.seek(0)
                driftcsv.seek(0)

                for measure_name in list(cached['measure'].keys()):
                    if measure_name != "start_time" \
                        and measure_name != "end_time"\
                        and measure_name not in dummy_measures:
                        del cached['measure'][measure_name]

            return cached

    pitch = [
        [float(Y) for Y in X.split(" ")]
        for X in open(os.path.join(get_attachpath(), meta["pitch"]))
    ]
    
    full_data = {
        "measure": {
            "start_time": start_time,
            "end_time": end_time
        }
    }

    gentle_drift_data = prosodic_measures.measure_gentle_drift(gentlecsv, driftcsv, start_time, end_time)
    
    full_data["measure"].update(gentle_drift_data)

    if calc_intense:
        voxit_data = prosodic_measures.measure_voxit(os.path.join(get_attachpath(), meta["path"]), 
            open(os.path.join(get_attachpath(), meta["pitch"])), 
            open(os.path.join(get_attachpath(), meta["harvest"])), 
            start_time, end_time)
        full_data["measure"].update(voxit_data)

    # cache full transcript measures
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

def cast_not_none(var, to_cast):
    if var is not None and type(var) is not to_cast:
        return to_cast(var)
    return var
    
def bool_not_none(var):
    if var is not None and type(var) is str:
        return var.lower() == 'true'
    return bool(var) if not None else None

# note: not passing start_time and end_time defaults to sending transcript duration
def _measure(id=None, start_time=None, end_time=None, force_gen=None, raw=None):

    start_time = cast_not_none(start_time, float)
    end_time = cast_not_none(end_time, float)
    force_gen = bool_not_none(force_gen)
    raw = bool_not_none(raw)

    return measure(id, start_time, end_time, force_gen, raw)

def _measure_all():    
    all_measures = {}
    all_docs = rec_set.get_infos()
    for doc in all_docs:
        if rec_set.get_meta(doc["id"]).get("align"):
            all_measures[doc["id"]] = _measure(id=doc["id"])
            all_measures[doc["id"]]["title"] = doc["title"]
            # guts.bschange(
            #     rec_set.dbs[doc["id"]],
            #     {"type": "set", "id": "meta", "key": "align_px", "val": cur_status})
            # time.sleep(1)
    return all_measures

def _windowed(cmd):

    id = cmd["id"]
    params = cmd["params"]
    meta = rec_set.get_meta(id)

    pitch = [
        [float(Y) for Y in X.split(" ")]
        for X in open(os.path.join(get_attachpath(), meta["pitch"]))
    ]

    # redundacy, CSV did not load sometimes on older versions of Drift. Generate if nonexistent
    if not meta.get("csv"):
        gen_csv({ "id": id })

    # check, maybe Drift is now running on calc_intense mode even though it wasn't when the audio file was originally uploaded
    # Generate Harvest if nonexistent
    if calc_intense and not meta.get("harvest"):
        _harvest({ "id": id })

    # TODO will these hang? this is just to prevent concurrent calls to harvest/csv during their initialization throwing errors
    while not rec_set.get_meta(id).get("csv"):
        pass
    
    while calc_intense and not rec_set.get_meta(id).get("harvest"):
        pass

    meta = rec_set.get_meta(id)
    driftcsv = open(os.path.join(get_attachpath(), meta["csv"]))
    gentlecsv = open(os.path.join(get_attachpath(), meta["aligncsv"]))

    batched_windows = {}

    # batch window parameters so we can calculate multiple windows that have same length
    for measure in params:
        window_len = params[measure]

        if window_len not in batched_windows:
            batched_windows[window_len] = []
        
        batched_windows[window_len].append(measure)


    batched_measures = {}
    audio_len = len(pitch) / 100.0
    
    full_data = {
        "measure": {
        }
    }
    
    if calc_intense:
        audio_path = os.path.join(get_attachpath(), meta["path"])
        pitch_file = open(os.path.join(get_attachpath(), meta["pitch"]))
        harvest_file = open(os.path.join(get_attachpath(), meta["harvest"]))

    for window_len in batched_windows:
        measure_labels = batched_windows[window_len]
        
        for i in range(0, int(audio_len), int(window_len)):
            win_start = i
            win_end = min(i + window_len, audio_len)
            
            print(f'{win_start} - {win_end}')
            # restart file streams
            gentlecsv.seek(0)
            driftcsv.seek(0)
            gentle_drift_data = prosodic_measures.measure_gentle_drift(gentlecsv, driftcsv, win_start, win_end)

            if calc_intense:
                # restart file streams
                pitch_file.seek(0)
                harvest_file.seek(0)
                voxit_data = prosodic_measures.measure_voxit(audio_path, 
                    pitch_file, 
                    harvest_file, 
                    win_start, win_end)

            
            # we'll just update full_data with returned map so that labels end up in the same order as returned by prosodic_measures
            # this is purely for aesthetic purposes and we'll replace the values the labels are paired with in the end
            if len(full_data["measure"]) == 0:
                full_data["measure"].update(gentle_drift_data)

                if calc_intense:
                    full_data["measure"].update(voxit_data)
                    
                for label in full_data["measure"]:
                    full_data["measure"][label] = []


            for label in measure_labels:
                if label in full_data["measure"]:
                    if label in gentle_drift_data:
                        full_data["measure"][label].append(gentle_drift_data[label])
                    elif label in voxit_data:
                        full_data["measure"][label].append(voxit_data[label])

    return full_data


root.putChild(b"_harvest", guts.PostJson(_harvest, runasync=True))
root.putChild(b"_measure", guts.GetArgs(_measure, runasync=True))
root.putChild(b"_measure_all", guts.GetArgs(_measure_all, runasync=True))
root.putChild(b"_windowed", guts.PostJson(_windowed, runasync=True))
root.putChild(b"_rms", guts.PostJson(rms, runasync=True))
root.putChild(b"_settings", guts.PostJson(_settings, runasync=True))
root.putChild(b"_db", db)
root.putChild(b"_attach", guts.Attachments(get_attachpath()))        
root.putChild(b"_stage", guts.Codestage(wwwdir="www"))
root.putChild(b"media", secureroot.FolderlessFile(get_attachpath()))

# detect SIGINT so we can kill Gentle process
def cleanup(*args):
    gentle_proc.send_signal(signal.SIGINT)
    # have to kill Twisted reactor manually, since it seems to keep running when we catch SIGINT
    reactor.stop()

signal.signal(signal.SIGINT, cleanup)

print(f"=== If you are running a development environment, DO NOT navigate to localhost:{port} to see the frontend. Go to React's endpoint (usually localhost:3000) ===")
guts.serve("stage.py", globals(), root=root)