import { useState, useRef } from "react";
import { PITCH_H, t2x } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";
import { GraphInteractArea, GraphRazors } from "./GraphSVGInteractables";
import { Amplitude, DetailedPitchTrace, Gaps, Grid, Infotag, Words } from "./GraphSVGParts";

function Graph(props) {

    let {
        id,
        playing,
        razorTime,
        selection,
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
    const graphWrapper = useRef(null);

    // scroll overview wrapper when razor goes out of view
    if (playing && graphWrapper.current && razorTime) {
        let left = graphWrapper.current.scrollLeft, right = left + graphWrapper.current.clientWidth;
        let rX = t2x(razorTime - selection.start_time);
        if (rX < left || rX > right) {
            graphWrapper.current.scroll(rX, 0);
        }
    }

    // use inProgressSelection here so we can update graph size as user is dragging over overview area
    let { start_time, end_time } = inProgressSelection;
    let selectionWidth = t2x(end_time - start_time);

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

