import { useEffect, useRef, useState } from "react";
import { hasData, includeDocInSelf, pitchQuery, alignQuery, rmsQuery, prevDef, prevDefCb, queryAlign, queryPitch, queryRMS, RESOLVING } from "../utils/Utils";
import { useQuery } from '@tanstack/react-query';
import { durationFromPitch } from "../utils/MathUtils";
import { getAlign, getPitch, getRMS } from "../utils/Queries";

function OverviewSection({ id, pitch: pitchURL, align: alignURL, rms: rmsURL, autoscroll, setAutoScroll, razorTime, setAudioTime, audioLoaded, selection, setSelection, docObject }) {

    const { isSuccess: pitchReady, data: pitchData } = useQuery(['pitch', id], () => getPitch(pitchURL), { enabled: !!pitchURL });
    const { isSuccess: alignReady, data: alignData } = useQuery(['align', id], () => getAlign(alignURL), { enabled: !!alignURL });
    const { isSuccess: rmsReady, data: rmsData } = useQuery(['rms', id], () => getRMS(rmsURL), { enabled: !!rmsURL });

    return (
        <div className="overview">
            <OverviewHeader { ...{ id, autoscroll, setAutoScroll } }/>
            <div className="overview-wrapper">
                {
                    pitchReady && alignReady && audioLoaded
                        ? <Overview { ...{ ...includeDocInSelf(docObject), pitchData, alignData, razorTime, setAudioTime, selection, setSelection } }/>
                        : <div className="loading-placement">Loading... If this is taking too long, try reloading the webpage, turning off AdBlock, or reuploading this data file</div>

                }
            </div>
        </div>
    );
}

function OverviewHeader({ id, autoscroll, setAutoScroll }) {

    const goToBegOfTranscript = () => {
        console.log("TODO DocInfo.js go to beg of transcript");
    }

    const onContScrollToggle = () => setAutoScroll(oldAutoScroll => !oldAutoScroll);

    return (        
        <div className="overview-top">
            <p>Drag to select a region</p>
            <div className="play-opt">
                {/* prevent focus on mousedown */}
                <button onMouseDown={ prevDef } onClick={ goToBegOfTranscript }>jump to start of transcript</button>

                <label htmlFor={ id + "-rad1" } title="auto-select next region on playthrough">continuous scrolling</label>
                <input id={ id + "-rad1" } type="checkbox" name="playopt" value={ autoscroll } 
                    onChange={ onContScrollToggle } onMouseDown={ prevDef }></input>
            </div>
        </div>
    );

}

function Overview({ id, pitchData, razorTime, setAudioTime, selection, setSelection }) {

    const { current: duration } = useRef(durationFromPitch(pitchData)), 
        { current: width } = useRef(duration * 10),
        { current: height } = useRef(50);

    const startSelection = ev => {
        ev.preventDefault();
        setAudioTime(ev.nativeEvent.offsetX / width * duration)
    }

    return (
        <svg width={ width } height={ height } onMouseDown={ startSelection }>
            <rect key="overview-svg" x={ 0 } y={ 0 } width="100%" height={ height } fill="#F7F7F7">

            </rect>
            <SelectionOverlay { ...{ id, width, height, duration, selection } } />
            <Razor { ...{ razorTime, width, height, duration } } />
        </svg>
    );
}

function Razor({ razorTime, width, height, duration }) {
    if (razorTime == null) return null;

    return (
        <rect key="razor" x={ width * (razorTime / duration) }
                y={ 0 }
                width={ 2 }
                height={ height }
                fill='rgba(128, 55, 43, 0.4)'></rect>
    );
}

function SelectionOverlay({ id, width, height, duration, selection }) {
    if (selection.start_time == null) return null;

    return (
        <>
            <rect key={ id + "-o-selection-pre" } x={ 0 } y={ 0 } width={ width * (selection.start_time / duration) } height={ height } fill='rgba(218,218,218,0.4)'></rect> 
            <rect key={ id + "-o-selection-post" } x={ width * (selection.start_time / duration) + width * ((selection.end_time - selection.start_time) / duration) } y={ 0 } width={ width - (width * (selection.start_time / duration) + width * ((selection.end_time - selection.start_time) / duration)) } height={ height } fill='rgba(218,218,218,0.4)'></rect> 
            <rect key={ id + "-o-selection-border" }
                x={ width * (selection.start_time / duration) }
                y={ 1 }
                width={ width * ((selection.end_time - selection.start_time) / duration) }
                height={ height - 2 }
                stroke={ 'rgba(128, 55, 43, 1)' }
                strokeWidth={ 1 }
                fill={ 'none' }
                rx={ 2 }> </rect>
        </>
    );
}

export default OverviewSection;