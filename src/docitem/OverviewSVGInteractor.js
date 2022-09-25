import { useEffect, useRef } from "react";
import { prevDef, useProsodicData } from "../utils/Utils";
import OverviewSVG from "./OverviewSVG";

function OverviewSVGInteractor(props) {

    let { 
        playing,
        setPlaying,
        resetRazor,
        seekAudioTime,
        setSelection,
        inProgressSelection,
        setInProgressSelection,
        docObject } = props;

    const { pitchData } = useProsodicData(docObject);

    const dragging = useRef(), 
        t1 = useRef(), 
        t2 = useRef(), 
        wasPlaying = useRef(false);

    const duration = pitchData.duration, width = duration * 10, height = 50;

    const handleMouseMove = ev => {
        ev.stopPropagation();
        ev.nativeEvent.stopPropagation();
        if (!dragging.current) return;

        t2.current = (ev.nativeEvent.offsetX / width) * duration;
        t2.current = Math.max(0, Math.min(t2.current, duration));

        if (Math.abs(t2.current - t1.current) > 0.2) {

            let start = Math.min(t1.current, t2.current);
            let end = Math.max(t1.current, t2.current);

            // Limit to 30secs
            end = Math.min(start + 30, end);

            setInProgressSelection({
                start_time: start,
                end_time: end
            });
        }
    }

    const handleMouseDone = ev => {
        if (!dragging.current) return;

        resetRazor();
        
        if (Math.abs(t2.current - t1.current) < 0.2) {
            seekAudioTime(t2.current);
        }
        else {
            setSelection(inProgressSelection);
            
            if (wasPlaying.current)
                seekAudioTime(inProgressSelection.start_time);
        }

        if (wasPlaying.current)
            setPlaying(true);

        wasPlaying.current = dragging.current = false;
    }
    
    const startSelection = ev => {
        ev.preventDefault();

        t1.current = (ev.nativeEvent.offsetX / width) * duration;
        t2.current = t1.current;

        wasPlaying.current = playing;
        dragging.current = true;

        // if it's playing, pause it
        setPlaying(false);
    }

    return (
        <div width={ width } height={ height } 
            onMouseDown={ startSelection }
            onMouseMove={ handleMouseMove }
            onMouseLeave={ handleMouseDone }
            onMouseUp={ handleMouseDone }>
            { props.children }
        </div>
    );
}

export default OverviewSVGInteractor;