import { Fragment } from "react";
import { fr2x, getTranscriptInfoFromAlign, pitch2y, pitchStats, PITCH_H, t2w, t2x } from "../utils/MathUtils";

function DetailedPitchTrace({ pitchData, alignData, curSelection }) {

    let { start_time, end_time } = curSelection;
    let [ tsStart, tsEnd ] = getTranscriptInfoFromAlign(alignData);

    // once we slice pitchData, pitch indices are gonna be relative to selection start/ends
    tsStart -= start_time;
    tsEnd -= start_time;

    let ps = {
        outsideTS: '',
        duringTS: '',
    };
    let opacities = [ '30%', '60%' ];
    let started = false, lastPath = '';

    let seq = pitchData.pitchStats.smoothed.slice(Math.round(start_time * 100),
        Math.round(end_time * 100));

    // we've selected an audio window with no pitch data (e.g. silence, noise)
    if (!seq) return;
    
    seq.forEach((p, p_idx) => {
        let curPath = p_idx / 100 < tsEnd && p_idx > tsStart ? 'duringTS' : 'outsideTS';

        if (lastPath != curPath) {
            started = false;
            lastPath = curPath;
        }

        if (p > 0) {
            if (!started) {
                ps[curPath] += 'M ';
            }
            ps[curPath] += '' + fr2x(p_idx) + ',' + (pitch2y(p)) + ' ';
            started = true;
        }
        else {
            started = false;
        }
    })

    return (
        <>
        {
            Object.values(ps).map((d, ind) => <path 
                key={ ind }
                d={ d }
                strokeWidth={ 3 }
                fill={ 'none' }
                strokeLinecap={ 'round' }
                stroke={ '#D58139' }
                opacity={ opacities[ind] }
            />)
        }
        </>

        
    )
}

function Amplitude({ rmsData, curSelection }) {

    let { start_time, end_time } = curSelection;

    return (
        <>
        {
            rmsData.slice(Math.round(start_time * 100), Math.round(end_time * 100))
                .map((r, r_idx) => {
                    let h = r * PITCH_H / 5;
                    let cy = 9.25 / 10 * PITCH_H;

                    return <line 
                        key={ r_idx }
                        x1={ fr2x(r_idx) }
                        y1={ cy - (h / 2) }
                        x2={ fr2x(r_idx) }
                        y2={ cy + (h / 2) }
                        stroke='#646464'
                        strokeWidth={ 2 }
                    />
                })
        }
        </>
    );
}

function Words({ alignData, pitchData, curSelection }) {

    let { start_time, end_time } = curSelection;

    let seq = pitchData.pitchStats.smoothed.slice(Math.round(start_time * 100),
        Math.round(end_time * 100));
    
    return (
        <>
        {
            alignData.segments.map((seg, seg_idx) => 
                <Fragment key={ seg_idx }>
                {
                    seg.wdlist.map((wd, wd_idx) => {
                        if (!wd.end) { return }
            
                        if (wd.start >= end_time || wd.end <= start_time) { return; }
            
                        if (wd.type == 'gap') {
                            return <rect
                                key={ wd_idx + 'gap' }
                                x={ t2x(wd.start - start_time) }
                                y={ 0 }
                                width={ t2w(wd.end - wd.start) }
                                height={ PITCH_H }
                                fill={ 'rgba(0,0,0,0.05)' }
                            />
                        }
            
                        let wd_stats = pitchStats(pitchData.slice(Math.round(wd.start * 100),
                            Math.round(wd.end * 100)));
            
                        return <text  
                            key={ wd_idx + 'text' }                      
                            class={ wd.type == 'unaligned' ? 'unaligned' : 'word' }
                            x={ t2x(wd.start - start_time) }
                            //y={ pitch2y((wd_stats&&wd_stats.pitch_mean) || seq_stats.pitch_mean) - 2 }
                            y={ Math.max(30, pitch2y((wd_stats && wd_stats.pitch_percentile_91) || (seq || {}).pitch_mean || 0) - 2) }
                            fill={ '#3B5161' }
                        >{ wd.word }</text>
                    })
                }
                </Fragment>
            )
        }
        </>
    );
}

export {
    DetailedPitchTrace,
    Amplitude,
    Words,
};
