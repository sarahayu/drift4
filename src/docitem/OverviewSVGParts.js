import { Fragment, useMemo } from "react";
import { getTranscriptBoundsFromAlign, pitch2y, pitchStats } from "../utils/MathUtils";

function SimplifedPitchTrace({ pitchData, alignData, width, duration }) {

    // usememo for buttery smooth performance ^-^
    const pitchTrace = useMemo(() => {
        let pitch_step = 0.01;      // each index of array `smoothed` is 10 ms
        let voiceStart;

        let [firstword, lastword] = getTranscriptBoundsFromAlign(alignData);
        return pitchData.pitchStats.smoothed.map((pitch, p_idx) => {
            if (pitch > 0 && !voiceStart) {
                voiceStart = p_idx;
            }
            // if voiced period ends, is greater than 20 ms or passes between the boundary of either start or end_time,
            // render a rectangle that represents the average pitch of that voice period
            else if (voiceStart 
                && ((pitch === 0 && p_idx - voiceStart > 20)
                    || ((p_idx - 1) * pitch_step <= firstword && p_idx * pitch_step > firstword)
                    || ((p_idx - 1) * pitch_step < lastword && p_idx * pitch_step >= lastword))) {
    
                let voicedPeriod = pitchData.slice(Math.floor(voiceStart), Math.floor(p_idx));
                let pitch_mean = (pitchStats(voicedPeriod) || {})['pitch_mean'];
                let oldVoiceStart = voiceStart;
                
                voiceStart = pitch === 0 ? null : p_idx;

                if (pitch_mean) {        
                    let y = pitch2y(pitch_mean) / 5,
                        within_transcript_duration = p_idx * pitch_step >= firstword && p_idx * pitch_step <= lastword;
                    
                    return <rect
                        key={ p_idx }
                        x={ width * (oldVoiceStart * pitch_step / duration) }
                        y={ y }
                        width={ width * (p_idx - oldVoiceStart) * pitch_step / duration }
                        height={ within_transcript_duration ? 2 : 1 }
                        fill={ within_transcript_duration ? '#E4B186' : '#C9C9C9' }
                    ></rect>
                }
            }
        })
    }, [pitchData, alignData]);


    return (
        <>{ pitchTrace }</>
    )
}

function WordGaps({ alignData, width, duration, height }) {

    // usememo for buttery smooth performance ^-^
    const wordGaps = useMemo(() => {
        let firstword = Infinity, lastword = -1;

        return alignData.segments.map((seg, seg_idx) => 
            <Fragment key={ seg_idx }>
            {
                seg.wdlist.map((wd, wd_idx) => {
                    if (!wd.end || !wd.start) return;
    
                    if (wd.type == 'gap') {
                        return <rect
                            key={ wd_idx }
                            x={ width * (wd.start / duration) }
                            y={ 0 }
                            width={ width * (wd.end - wd.start) / duration }
                            height={ height }
                            fill='#D9D9D9'
                        ></rect>
                    }
                    else {
                        if (wd.end > lastword)
                            lastword = wd.end;
                        if (wd.start < firstword)
                            firstword = wd.start;
                    }
                })
            }
            </Fragment>
        )
    }, [alignData])

    return (
        <>{ wordGaps }</>
    )
}

function OverviewRazor({ razorTime, width, height, duration }) {
    return (
        <rect key="razor" x={ width * (razorTime / duration) }
                y={ 0 }
                width={ 2 }
                height={ height }
                fill='rgba(128, 55, 43, 0.4)'></rect>
    );
}

function SelectionOverlay({ width, height, duration, inProgressSelection }) {
    return (
        <>
            <rect key={ "selection-pre" }
                x={ 0 }
                y={ 0 }
                width={ width * (inProgressSelection.start_time / duration) }
                height={ height }
                fill='rgba(218,218,218,0.4)'></rect> 
            <rect key={ "selection-post" }
                x={ width * (inProgressSelection.start_time / duration) + width * ((inProgressSelection.end_time - inProgressSelection.start_time) / duration) }
                y={ 0 }
                width={ width - (width * (inProgressSelection.start_time / duration) + width * ((inProgressSelection.end_time - inProgressSelection.start_time) / duration)) }
                height={ height }
                fill='rgba(218,218,218,0.4)'></rect> 
            <rect key={ "selection-border" }
                x={ width * (inProgressSelection.start_time / duration) }
                y={ 1 }
                width={ width * ((inProgressSelection.end_time - inProgressSelection.start_time) / duration) }
                height={ height - 2 }
                stroke={ 'rgba(128, 55, 43, 1)' }
                strokeWidth={ 1 }
                fill={ 'none' }
                rx={ 2 }> </rect>
        </>
    );
}

export {
    WordGaps,
    SimplifedPitchTrace,
    OverviewRazor,
    SelectionOverlay,
};
