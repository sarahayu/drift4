import { Fragment, useMemo } from "react";
import { fr2x, getTranscriptInfoFromAlign, pitch2y, pitchStats, PITCH_H, range, t2w, t2x, x2t } from "../utils/MathUtils";

function Gaps({ alignData, inProgressSelection }) {

    let { start_time, end_time } = inProgressSelection;
    
    return (
        <>
        {
            alignData.segments.map((seg, seg_idx) => 
                <Fragment key={ seg_idx }>
                {
                    seg.wdlist
                        .filter(wd => 
                            wd.start >= start_time && wd.end <= end_time && wd.type == 'gap')
                        .map((wd, wd_idx) => <rect
                            key={ seg_idx + '' + wd_idx + 'gap' }
                            x={ t2x(wd.start - start_time) }
                            y={ 0 }
                            width={ t2w(wd.end - wd.start) }
                            height={ PITCH_H }
                            fill={ 'rgba(0,0,0,0.05)' }
                        />)
                }
                </Fragment>
            )
        }
        </>
    );
}

var COLORS = { 50: "#DADADA", 100: "#E0E0E0", 200: "#E5E5E5", 400: "#F0F0F0" };

function Grid({ start_time, end_time }) {
    let lastYPx = PITCH_H;
    let selectionWidth = t2x(end_time - start_time);

    return (
        <>
        {
            // shaded regions
            range(50, 401, 50).filter(yval => Object.keys(COLORS).includes(yval.toString())).map(yval => {
                let y_px = pitch2y(yval);
                let height = lastYPx - y_px;
                lastYPx = y_px;

                return <rect
                    key={ yval + 'rect'}
                    x={ 0 }
                    y={ pitch2y(yval) }
                    width={ '100%' }
                    height={ height }
                    fill={ COLORS[yval] }
                    opacity={ 0.2 }
                ></rect>
            })
        }
        {
            // horizontal grid lines
            range(50, 401, 50).map(yval => {
                let y_px = pitch2y(yval), color = COLORS[yval];

                return <line 
                    key={ yval + 'hline' }
                    x1={ 0 }
                    y1={ y_px }
                    x2={ selectionWidth }
                    y2={ y_px }
                    strokeWidth={ color ? 1 : 0.5 }
                    stroke={ '#DCDCDC' }
                />
            })
        }
        {
            // vertical grid lines
            range(Math.ceil(start_time), end_time, 1).map(x => {
                if (x == 0) return;
                let x_px = t2x(x - start_time);

                return <Fragment key={ x + 'vlinenums'}>
                    <line 
                        x1={ x_px }
                        y1={ 0 }
                        x2={ x_px }
                        y2={ PITCH_H }
                        stroke={ '#DCDCDC' }
                        />
                    <text 
                        x={ x_px - 2 }
                        y={ PITCH_H + 16 }
                        fill={ '#3B5161' }
                    >{ x }</text>
                </Fragment>
            })
        }
        </>
    )
}

function DetailedPitchTrace({ pitchData, alignData, inProgressSelection }) {

    const pitchTrace = useMemo(() => {
        let { start_time, end_time } = inProgressSelection;
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

        return Object.values(ps).map((d, ind) => <path 
            key={ ind }
            d={ d }
            strokeWidth={ 3 }
            fill={ 'none' }
            strokeLinecap={ 'round' }
            stroke={ '#D58139' }
            opacity={ opacities[ind] }
        />)

    }, [ pitchData, alignData, inProgressSelection ])


    return (
        <>{ pitchTrace }</>
    )
}


function Amplitude({ rmsData, inProgressSelection }) {

    const ampPath = useMemo(() => {

        let { start_time, end_time } = inProgressSelection;
    
        let ps = '';
    
        rmsData.slice(Math.round(start_time * 100), Math.round(end_time * 100))
            .forEach((r, r_idx) => {
                let h = r * PITCH_H / 5;
                let cy = 9.25 / 10 * PITCH_H;
    
                ps += `M ${fr2x(r_idx)},${cy - (h / 2)} ${fr2x(r_idx)},${cy + (h / 2)} `
            })

        return <path 
            d={ ps }
            fill={ 'none' }
            stroke='#646464'
            strokeWidth={ 2 }
        />

    }, [ rmsData, inProgressSelection ])

    return (
        <>{ ampPath }</>
    );
}

function Words({ alignData, pitchData, inProgressSelection }) {

    let { start_time, end_time } = inProgressSelection;

    let selectionPitchMean;
    
    return (
        <>
        {
            alignData.segments.map((seg, seg_idx) => 
                <Fragment key={ seg_idx }>
                {
                    seg.wdlist
                        .filter(wd => 
                            wd.start >= start_time && wd.end <= end_time && wd.type != 'gap')
                        .map((wd, wd_idx) => {

                            let wordPitch = pitchStats(pitchData.slice(Math.round(wd.start * 100),
                                Math.round(wd.end * 100)))?.pitch_percentile_91;
    
                            // word might exist where pitch data is not available, so use average pitch of selection
                            if (!wordPitch)
                                wordPitch = selectionPitchMean || (selectionPitchMean = pitchStats(pitchData.slice(Math.round(start_time * 100),
                                    Math.round(end_time * 100)))?.pitch_mean || 0);
                
                            return <text  
                                key={ wd_idx + 'text' }                      
                                className={ wd.type == 'unaligned' ? 'unaligned' : 'word' }
                                x={ t2x(wd.start - start_time) }
                                y={ Math.max(30, pitch2y(wordPitch)) }
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

function Infotag({ hoveringPos, start_time, pitchData }) {
    return (
        <div className="infotag" 
            style={{ left: `${ t2x(hoveringPos - start_time) + 10 }px`, top: `${ PITCH_H / 2 }px` }}>
            <div>
                <div>
                    <span>time</span>
                    <span>{ Math.round(hoveringPos * 100) / 100 }</span>
                </div>
                <div>
                    <span>pitch</span>
                    <span>{ pitchData[Math.round(hoveringPos * 100)] || 'N/A' }</span>
                </div>
            </div>
        </div>
    );
}

export {
    Gaps,
    Grid,
    DetailedPitchTrace,
    Amplitude,
    Words,
    Infotag,
    COLORS,
};
