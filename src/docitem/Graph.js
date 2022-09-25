import { useState } from "react";
import { pitch2y, PITCH_H, range, t2x } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";
import { GraphInteractArea, GraphRazors } from "./GraphSVGInteractables";
import { Amplitude, COLORS, DetailedPitchTrace, Gaps, Grid, Infotag, Words } from "./GraphSVGParts";

function Graph(props) {

    let {
        id,
        razorTime,
        inProgressSelection,
        seekAudioTime,
        docObject,
    } = props;

    const {
        pitchData,
        alignData,
        rmsData,
    } = useProsodicData(docObject);

    const [ hoveringPos, setHoveringPos ] = useState(false);

    let { start_time, end_time } = inProgressSelection;
    let selectionWidth = t2x(end_time - start_time);

    return (
        <div id={ id + "-main-graph-wrapper" } className="main-graph-wrapper">
            <svg
                width={ selectionWidth }
                height={ PITCH_H + 35 }>
                {/* x-axis */}
                <line x1={ 0 } y1={ PITCH_H } x2={ selectionWidth } y2={ PITCH_H } strokeWidth={ 2 } stroke='#DCDCDC'/>
                <Gaps alignData={ alignData } inProgressSelection={ inProgressSelection } />
                <Grid start_time={ start_time } end_time={ end_time } />
                <DetailedPitchTrace pitchData={ pitchData } alignData={ alignData } inProgressSelection={ inProgressSelection } />
                <Amplitude rmsData={ rmsData } inProgressSelection={ inProgressSelection } />
                <Words alignData={ alignData } pitchData={ pitchData } inProgressSelection={ inProgressSelection } />
                <GraphRazors razorTime={ razorTime } start_time={ start_time } hoveringPos={ hoveringPos } />
                <GraphInteractArea width={ selectionWidth } start_time={ start_time } setHoveringPos={ setHoveringPos } seekAudioTime={ seekAudioTime } />
            </svg>
            { hoveringPos && <Infotag start_time={ start_time } hoveringPos={ hoveringPos } pitchData={ pitchData } /> }
        </div>
    )
}

function GraphEdge() {
    return (
        <svg width={ 50 } height={ PITCH_H + 1 } className="x-axis">
            <line strokeWidth={ 2 } stroke='#DCDCDC' 
                x1={ 49 }
                y1={ 0 }
                x2={ 49 }
                y2={ PITCH_H + 1 }/>
            {
                range(50, 401, 50).map(yval => {
                    let y_px = pitch2y(yval), color = COLORS[yval];

                    if (color)
                        return <text
                            key={ yval }
                            x='30%'
                            y={ y_px + 5 }
                            fill='#3B5161'
                        >{ yval }</text>
                })
            }
        </svg>
    )
}

export {
    Graph,
    GraphEdge,
};

