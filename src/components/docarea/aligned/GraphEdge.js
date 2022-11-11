import { pitch2y, PITCH_H, range } from "utils/MathUtils";
import { COLORS } from "./GraphSVGParts";

function GraphEdge() {
    return (
        <svg width={50} height={PITCH_H + 1} className="x-axis">
            <line strokeWidth={2} stroke='#DCDCDC'
                x1={49}
                y1={0}
                x2={49}
                y2={PITCH_H + 1} />
            {range(50, 401, 50).map(yval => {
                let y_px = pitch2y(yval), color = COLORS[yval];

                if (color)
                    return <text
                        key={yval}
                        x='30%'
                        y={y_px + 5}
                        fill='#3B5161'
                    >{yval}</text>;
            })}
        </svg>
    );
}

export default GraphEdge;