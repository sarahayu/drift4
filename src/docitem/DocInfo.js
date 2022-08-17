import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getAlign, getPitch } from "../utils/Queries";
import { hasData, includeDocInSelf, prevDef, prevDefCb, RESOLVING } from "../utils/Utils";
import OverviewSection from "./Overview";

function DocInfo({ id, align: alignURL, pitch: pitchURL, path: audioURL, docObject }) {

    const [ playing, setPlaying ] = useState(false);
    const [ razorTime, setRazorTime ] = useState(null);
    const [ autoscroll, setAutoScroll ] = useState(false);
    const [ audioLoaded, setAudioLoaded ] = useState(false);
    const [ selection, setSelection ] = useState({ start_time: null, end_time: null })
    const { current: audio } = useRef(new Audio('/media/' + audioURL));

    useQuery(['align', id], () => getAlign(alignURL), { 
        enabled: !!alignURL ,
        onSuccess: data => {
            let { segments } = data;
            setSelection({
                start_time: segments[0].start,
                end_time: Math.min(segments[0].start + 20, segments[segments.length - 1].end),
            });
        },
    });


    const setAudioPlaying = _playing =>  { if (audioLoaded) setPlaying(_playing) };
    
    const setAudioTime = time => setRazorTime(audio.currentTime = time);

    const updateRazor = () => {
        setRazorTime(audio.currentTime);
        if (playing)
            window.requestAnimationFrame(updateRazor);
    }

    const checkDonePlaying = () => {
        if (audio.currentTime >= audio.duration) {
            setRazorTime(null);
            setPlaying(false);
        }
    }

    useEffect(() => {
        audio.oncanplaythrough = () => setAudioLoaded(true);
        audio.onpause = checkDonePlaying;
    }, []);

    useEffect(() => {
        if (playing) {
            audio.play();
            updateRazor();
        }
        else
            audio.pause();
    }, [playing]);

    return (
        <>
            <TopSection { ...{
                ...includeDocInSelf(docObject), 
                playing, 
                setAudioPlaying,
                autoscroll,
                setAutoScroll,
                razorTime,
                setAudioTime,
                audioLoaded,
                selection,
                setSelection,
                } } />
            <GraphSection />
            <TableSection />
        </>
    );
}

function TopSection({ id, playing, setAudioPlaying, autoscroll, setAutoScroll, razorTime, setAudioTime, audioLoaded, selection, setSelection, docObject }) {

    const togglePlayPause = () => {
        setAudioPlaying(oldPlaying => !oldPlaying);
    }

    return (
        <div className="top-section">
            <button className="play-btn" onClick={ togglePlayPause } disabled={ !audioLoaded }>
                <img src={ playing ? 'pause-icon.svg' : 'play-icon.svg' } alt="Play/Pause icon" />
                <span>{ playing ? 'pause' : 'play' }</span>
            </button>
            <OverviewSection { ...{ ...includeDocInSelf(docObject), autoscroll, setAutoScroll, razorTime, setAudioTime, audioLoaded, selection, setSelection } } />
        </div>
    );
}

function GraphSection() {
    return (
        <div className="graph-section"></div>
    );
}

function TableSection() {
    return (
        <div className="table-section"></div>
    );
}

export default DocInfo;