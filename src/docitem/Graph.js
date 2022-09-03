import { pitch2y, PITCH_H, range, t2x } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";
import { Amplitude, DetailedPitchTrace, Words } from "./GraphSVGParts";

var COLORS = { 50: "#DADADA", 100: "#E0E0E0", 200: "#E5E5E5", 400: "#F0F0F0" };

function Graph(props) {

    let {
        curSelection,
        docObject,
    } = props;

    const {
        pitchReady,
        pitchData,
        alignReady,
        alignData,
        rmsData,
    } = useProsodicData(docObject);

    let { start_time, end_time } = curSelection;
    let selectionWidth = t2x(end_time - start_time);

    return (
        <svg
            width={ selectionWidth }
            height={ PITCH_H + 35 }>
            {/* x-axis */}
            <line x1={ 0 } y1={ PITCH_H } x2={ selectionWidth } y2={ PITCH_H } strokeWidth={ 2 } stroke='#DCDCDC'/>
            <Grid start_time={ start_time } end_time={ end_time } />
            <DetailedPitchTrace pitchData={ pitchData } alignData={ alignData } curSelection={ curSelection } />
            <Amplitude rmsData={ rmsData } curSelection={ curSelection } />
            <Words alignData={ alignData } pitchData={ pitchData } curSelection={ curSelection } />
        </svg>
    )
}

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

                return <>
                    <line 
                        key={ x + 'vline' }
                        x1={ x_px }
                        y1={ 0 }
                        x2={ x_px }
                        y2={ PITCH_H }
                        stroke={ '#DCDCDC' }
                        />
                    <text 
                        key={ x + 'vnum' }
                        x={ x_px - 2 }
                        y={ PITCH_H + 16 }
                        fill={ '#3B5161' }
                    >{ x }</text>
                </>
            })
        }
        </>
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
