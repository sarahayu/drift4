import { useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GutsContext } from 'context/GutsContext';

import useAudio from "hooks/useAudio"
import useProsodicData from "hooks/useProsodicData";
import useRefState from "hooks/useRefState";

import { getAlign } from "utils/Queries";
import { includeDocInSelf } from "utils/Utils";

import GeneralWidgetsSection from "./GeneralWidgetsSection";
import GraphSection from "./GraphSection";
import TableSection from "./TableSection";

function DocContentAligned({ 
    id, 
    align: alignURL, 
    path: audioURL, 
    razorTime: savedRazorTime, 
    autoscroll: savedAutoscroll, 
    selection: savedSelection, 
    docObject, 
    setPMContext 
}) {

    const { updateDoc } = useContext(GutsContext);
    const [ audioLoaded, setAudioLoaded ] = useState(false);
    // refs abound! because race conditions suck!
    const [ 
        playing, setPlaying, refPlaying, setRefAndPlaying 
    ] = useRefState(false);
    const [ razorTime, setRazorTime, refRazorTime ] = useRefState(savedRazorTime);
    const [ autoscroll, setAutoScroll, refAutoscroll ] = useRefState(savedAutoscroll);
    const [ 
        selection, setSelection, refSelection, setRefAndSelection 
    ] = useRefState(savedSelection)
    const [ inProgressSelection, setInProgressSelection ] = useState(selection);
    const audio = useAudio(id, '/media/' + audioURL);
    const razorSoughtManually = useRef(false);

    // TODO move audio logic to a hook
    const seekAudioTime = time => {
        setRazorTime(audio.currentTime = time);
        razorSoughtManually.current = true;
    }

    const updateRazor = () => {

        // check for refPlaying rather than playing because ref will be more up to date in the case it is
        // set to false in audio.onended
        if (refPlaying.current == false)
            return;

        // if razor is outside selection bounds
        if (audio.currentTime < refSelection.current.start_time - 0.01 || audio.currentTime > refSelection.current.end_time + 0.01) {

            // if not autoscrolling or caused by clicking outside bounds, pause/reset
            if (!refAutoscroll.current && !razorSoughtManually.current) {
                setPlaying(false);
                resetRazor();
                return;
            }
            
            // refs are more up-to-date, needed for razors that update quickly
            // (sometimes when clicking outside selection region it won't get updated in time)
            setRefAndSelection({
                start_time: audio.currentTime,
                end_time: Math.min(audio.currentTime + 20, audio.duration),
            })
        }
        
        razorSoughtManually.current = false;
        setRazorTime(audio.currentTime);
        window.requestAnimationFrame(updateRazor);
    }

    const resetRazor = () => {
        setRazorTime(null);
    }

    // do I have to do this before useProsodicData to ensure onSuccess calls? I'm not sure
    useQuery(['align', id], () => getAlign(alignURL), {
        enabled: !!alignURL,
        onSuccess: ({ segments }) => {
            setSelection({
                start_time: segments[0].start,
                end_time: Math.min(segments[0].start + 20, segments[segments.length - 1].end),
            });
        },
    });

    const {
        pitchReady,
        alignReady,
        rmsReady,
    } = useProsodicData(docObject);

    useEffect(() => {
        // audio has been loaded before, so just set loaded to true rather than hooking an event handler
        if (audio.loaded)
            setAudioLoaded(true);
        else
            audio.oncanplaythrough = () => {
                audio.loaded = true;
                setAudioLoaded(true);
            };

        audio.onended = () => {
            setRazorTime(null);
            // refs are more up-to-date, needed for razors that update quickly
            setRefAndPlaying(false);
        }

        return function saveTimingInformation() {
            audio.pause();

            updateDoc(id, {
                razorTime: refRazorTime.current,
                autoscroll: refAutoscroll.current,
                selection: refSelection.current,
            })
        }
    }, []);

    useEffect(() => {
        setInProgressSelection(selection);
    }, [ selection ]);

    useEffect(() => {
        if (playing) {
            audio.play();
            if (razorTime == null)
                seekAudioTime(selection.start_time)
            updateRazor();
        }
        else
            audio.pause();
    }, [ playing ]);

    const docReady = pitchReady && alignReady && rmsReady && audioLoaded;

    useEffect(() => {
        setPMContext({ selection, docReady });
    }, [ selection, pitchReady, alignReady, rmsReady, audioLoaded ])

    const allProps = {
        ...includeDocInSelf(docObject),
        playing,
        setPlaying,
        autoscroll,
        setAutoScroll,
        razorTime,
        setRazorTime,
        resetRazor,
        seekAudioTime,
        audioLoaded,
        selection,
        setSelection,
        inProgressSelection,
        setInProgressSelection,
        docReady,
    }

    return (
        <>
            <GeneralWidgetsSection { ...allProps } />
            <GraphSection { ...allProps } />
            <TableSection { ...allProps } />
        </>
    );
}

export default DocContentAligned;