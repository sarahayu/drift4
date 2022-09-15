import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { getAlign, getMeasureFullTS } from "../utils/Queries";
import { includeDocInSelf, linkFragment, useAudio, useProsodicMeasures, useRefState } from "../utils/Utils";
import { GutsContext } from './../GutsContext';
import Overview from "./Overview";
import TimesTable from "./TimesTable";
import { useProsodicData } from "../utils/Utils";
import { Graph, GraphEdge } from "./Graph";
import GraphDownloadButton from "./GraphDownloadButton";
import MeasuresTable from "./MeasuresTable";

function ProsodicContent({ id, align: alignURL, path: audioURL, razorTime: savedRazorTime, autoscroll: savedAutoscroll, selection: savedSelection, docObject }) {

    const { updateDoc } = useContext(GutsContext);
    const [ playing, setPlaying, refPlaying ] = useRefState(false);
    const [ audioLoaded, setAudioLoaded ] = useState(false);
    const [ razorTime, setRazorTime, refRazorTime ] = useRefState(savedRazorTime);
    const [ autoscroll, setAutoScroll, refAutoscroll ] = useRefState(savedAutoscroll);
    const [ selection, setSelection, refSelection ] = useRefState(savedSelection)
    const [ inProgressSelection, setInProgressSelection ] = useState(selection);
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

    // do I have to do this before useProsodicData to ensure onSuccess calls? I'm not sure
    useQuery(['align', id], () => getAlign(alignURL), {
        enabled: !!alignURL,
        onSuccess: ({ segments }) => {
            setSelection({
                start_time: segments[0].start,
                end_time: Math.min(segments[0].start + 20, segments[segments.length - 1].end),
            });
        },
    });

    const {
        pitchReady,
        alignReady,
        rmsReady,
    } = useProsodicData(docObject);

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
        setInProgressSelection(selection);
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

    let allProps = {
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
        inProgressSelection,
        setInProgressSelection,
        docReady: pitchReady && alignReady && rmsReady && audioLoaded
    }

    return (
        <>
            <TopSection { ...allProps } />
            <GraphSection { ...allProps } />
            <TableSection { ...allProps } />
        </>
    );
}

function TopSection(props) {

    let { setPlaying, playing, docReady } = props;

    const togglePlayPause = () => {
        setPlaying(oldPlaying => !oldPlaying);
    }

    return (
        <section className="top-section">
            <button className="play-btn" onClick={ togglePlayPause } disabled={ !docReady }>
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
        id,
        title,
        selection,
        docReady,
    } = props;

    return (
        <section className="graph-section">
            <div id={ id + '-detdiv' } className={ "detail " + (docReady ? "loaded" : "") }>
                {
                    docReady
                        ? <>
                            <GraphEdge/>
                            <div className="main-graph-wrapper">
                                <Graph { ...props }/>
                            </div>
                        </>
                        : <div className="loading-placement">Loading... If this is taking too long, try reloading the webpage, turning off AdBlock, or reuploading this data file</div>

                }
                { docReady && <GraphDownloadButton id={ id } title={ title } selection={ selection } /> }
            </div>
        </section>
    );
}

function TableSection(props) {

    return (
        <section className="table-section">
            <MeasuresTable { ...props } />
            <span><a 
                href={ linkFragment('prosodic-measures.html', 'Full Recording Duration vs. Selection', 'full-vs-selection') }
                title="Click for more information"
                target="_blank"
                >*vocal duration that corresponds to the transcript</a></span>
            <span><a 
                href={ linkFragment('about.html', 'About Voxit: Vocal Analysis Tools', 'about-voxit') }
                title="Click for more information about Voxit"
                target="_blank"
                >Prosodic measures are calculated using Voxit</a></span>
        </section>
    );
}

export default ProsodicContent;