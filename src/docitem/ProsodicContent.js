import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { getAlign } from "../utils/Queries";
import { includeDocInSelf, useAudio, useRefState } from "../utils/Utils";
import { GutsContext } from './../GutsContext';
import Overview from "./Overview";
import TimesTable from "./TimesTable";
import { useProsodicData } from "../utils/Utils";
import { range, pitch2y, t2x } from "../utils/MathUtils"
import { Graph, GraphEdge } from "./Graph";

function ProsodicContent({ id, align: alignURL, pitch: pitchURL, path: audioURL, docObject }) {

    const { docs, updateDoc } = useContext(GutsContext);
    const [playing, setPlaying, refPlaying] = useRefState(false);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const [razorTime, setRazorTime, refRazorTime] = useRefState(docs[id].razorTime);
    const [autoscroll, setAutoScroll, refAutoscroll] = useRefState(docs[id].autoscroll);
    const [selection, setSelection, refSelection] = useRefState(docs[id].selection)
    const [ curSelection, setCurSelection ] = useState(selection);
    const audio = useAudio(id, '/media/' + audioURL);

    const seekAudioTime = time => setRazorTime(audio.currentTime = time);

    const updateRazor = () => {
        setRazorTime(audio.currentTime);
        if (refPlaying.current)
            window.requestAnimationFrame(updateRazor);
    }

    const resetRazor = () => {
        setRazorTime(null);
        audio.currentTime = 0;
    }

    useQuery(['align', id], () => getAlign(alignURL), {
        enabled: !!alignURL,
        onSuccess: ({ segments }) => {
            setSelection({
                start_time: segments[0].start,
                end_time: Math.min(segments[0].start + 20, segments[segments.length - 1].end),
            });
        },
    });

    useEffect(() => {
        // audio has been loaded before, so just set loaded to true rather than hooking an event handler
        if (audio.loaded)
            setAudioLoaded(true);
        else
            audio.oncanplaythrough = () => {
                audio.loaded = true;
                setAudioLoaded(true);
            };

        audio.onended = () => {
            setRazorTime(null);
            setPlaying(false);
        }

        return function saveTimingInformation() {
            audio.pause();

            updateDoc(id, {
                razorTime: refRazorTime.current,
                autoscroll: refAutoscroll.current,
                selection: refSelection.current,
            })
        }
    }, []);

    useEffect(() => {
        setCurSelection(selection);
    }, [ selection ]);

    useEffect(() => {
        if (playing) {
            audio.play();
            if (razorTime == null)
                seekAudioTime(selection.start_time)
            updateRazor();
        }
        else
            audio.pause();
    }, [ playing ]);

    return (
        <>
            <TopSection {...{
                ...includeDocInSelf(docObject),
                playing,
                setPlaying,
                autoscroll,
                setAutoScroll,
                razorTime,
                setRazorTime,
                resetRazor,
                seekAudioTime,
                audioLoaded,
                selection,
                setSelection,
                curSelection,
                setCurSelection,
            }} />
            <GraphSection {...{
                ...includeDocInSelf(docObject),
                playing,
                setPlaying,
                autoscroll,
                setAutoScroll,
                razorTime,
                setRazorTime,
                resetRazor,
                seekAudioTime,
                audioLoaded,
                selection,
                setSelection,
                curSelection,
                setCurSelection,
            }} />
            <TableSection />
        </>
    );
}

function TopSection(props) {

    let { setPlaying, audioLoaded, playing } = props;

    const togglePlayPause = () => {
        setPlaying(oldPlaying => !oldPlaying);
    }

    return (
        <section className="top-section">
            <button className="play-btn" onClick={ togglePlayPause } disabled={ !audioLoaded }>
                <img src={ playing ? 'pause-icon.svg' : 'play-icon.svg' } alt="Play/Pause icon" />
                <span>{ playing ? 'pause' : 'play' }</span>
            </button>
            <Overview { ...props } />
            <TimesTable { ...props } />
        </section>
    );
}

function GraphSection(props) {

    let {
        audioLoaded,
        docObject,
    } = props;

    const {
        pitchReady,
        alignReady,
    } = useProsodicData(docObject);

    let loaded = pitchReady && alignReady && audioLoaded;

    return (
        <section className="graph-section">
            <div className={ "detail " + (loaded ? "loaded" : "") }>
                {
                    loaded
                        ? <>
                            <GraphEdge/>
                            <div className="main-graph-wrapper">
                                <Graph { ...props }/>
                            </div>
                        </>
                        : <div className="loading-placement">Loading... If this is taking too long, try reloading the webpage, turning off AdBlock, or reuploading this data file</div>

                }
            </div>
        </section>
    );
}

function TableSection() {
    return (
        <div className="table-section"></div>
    );
}

export default ProsodicContent;