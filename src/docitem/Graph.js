import { useState, useRef } from "react";
import { PITCH_H, t2x } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";
import { GraphInteractArea, GraphRazors } from "./GraphSVGInteractables";
import { Amplitude, DetailedPitchTrace, Gaps, Grid, Infotag, Words } from "./GraphSVGParts";

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

    const graphWrapper = useRef(null);

    if (graphWrapper.current && razorTime) {
        left = graphWrapper.current.scrollLeft, right = left + graphWrapper.current.clientWidth;
        rX = t2x(razorTime - T.selections[T.cur_doc].start_time);
        if (rX < left || rX > right) {
            graphWindow.scroll(rX, 0);
        }
    }

    return (
        <div ref={ graphWrapper } id={ id + "-main-graph-wrapper" } className="main-graph-wrapper">
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

export default Graph;

