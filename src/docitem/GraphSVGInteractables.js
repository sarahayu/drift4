import { PITCH_H, t2x, x2t } from "../utils/MathUtils";

function GraphRazors({ razorTime, hoveringPos, start_time }) {
    return (
        <>
        {
            // current time razor
            razorTime && <rect 
                x={ t2x(razorTime - start_time) }
                y={ 0 }
                width={ 2 }
                height={ PITCH_H }
                fill={ hoveringPos ? 'rgba(128, 55, 43, 0.4)' : '#80372B' }
            />
        }
        {
            // hover razor
            hoveringPos && <rect 
                x={ t2x(hoveringPos - start_time) }
                y={ 0 }
                width={ 2 }
                height={ PITCH_H }
                fill='#80372B'
            />
        }
        </>
    )
}

function GraphInteractArea({ width, start_time, setHoveringPos, seekAudioTime }) {
    const handleOnClick = ev => {
        ev.preventDefault();
        seekAudioTime(start_time + x2t(ev.nativeEvent.offsetX));
    }

    const handleMouseMove = ev => setHoveringPos(start_time + x2t(ev.nativeEvent.offsetX));

    const handleMouseLeave = () => setHoveringPos(null);

    return <rect 
        onClick={ handleOnClick }
        onMouseMove={ handleMouseMove }
        onMouseLeave={ handleMouseLeave }
        width={ width }
        height={ PITCH_H }
        stroke='none'
        fill='transparent'
    />;
}

export {
    GraphRazors,
    GraphInteractArea,
};
