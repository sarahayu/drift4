import { range } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";
import { Razor, SelectionOverlay, SimplifedPitchTrace, WordGaps } from "./OverviewSVGParts";

function OverviewSVG(props) {

    let { 
        razorTime,
        curSelection,
        docObject } = props;

    const { alignData, pitchData } = useProsodicData(docObject);

    const duration = pitchData.duration, width = duration * 10, height = 50;

    return (
        <svg width={ width } height={ height } >

            {/* background rect */}
            <rect x={ 0 } y={ 0 } width={ '100%' } height={ height } fill='#F7F7F7'></rect>

            <WordGaps { ...{ width, duration, height, alignData } }/>
            <SimplifedPitchTrace { ...{ pitchData, alignData, width, duration } }/>
            <SelectionOverlay { ...{ width, height, duration, curSelection } } />
            <Razor { ...{ razorTime, width, height, duration } } />

            { 
                /* print seconds */
                range(15, duration, 15).map(x => 
                    <text key={ x }
                        x={ width * (x / duration) + 2}
                        y={ height - 3}
                        fill='#3B5161'
                        opacity={ 0.5 }
                        >{ x + 's' }</text>) 
            }
        </svg>
    )
}

export default OverviewSVG;