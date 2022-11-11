import { useContext, useEffect, useRef, useState } from "react";
import { GutsContext } from "context/GutsContext";
import { postTriggerAlignCreation, postTriggerCSVCreation, postTriggerMatCreation, postUpdateDoc } from "utils/Queries";
import { displaySnackbarAlert, stopProp } from "utils/Utils";

function DocContentUnaligned({ id, path, docObject }) {

    const { foundGentle, attachPutFile, updateDoc } = useContext(GutsContext);
    const [ aligningInProgress, setAligningInProgress ] = useState(false);
    const transcriptValue = useRef("");
    const readyForTranscript = path != undefined;

    const setTranscript = async ev => {
        ev.preventDefault();
        ev.stopPropagation();

        var txt = transcriptValue.current;
        if (txt) {

            setAligningInProgress(true);

            var blob = new Blob([txt]);
            blob.name = "_paste.txt";

            let putResponse = await attachPutFile(blob);

            let updateResponse = await postUpdateDoc({ 
                id: id, 
                transcript: putResponse.path 
            });

            updateDoc(id, updateResponse.update);

            // TODO do all this trigger stuff serverside?
            await postTriggerAlignCreation(id);
            console.log("align returned");
            
            postTriggerCSVCreation(id)
                .then(() => console.log("csv returned"));
            postTriggerMatCreation(id)
                .then(() => console.log("mat returned"));
        }
        else {
            displaySnackbarAlert("ERROR: transcript is empty or null!")
        }
    }

    let buttonText;

    if (readyForTranscript) {
        if (aligningInProgress)
            buttonText = "aligning transcript...";
        else
            buttonText = "set transcript";
    }
    else
        buttonText = "uploading...";

    return (
        <>
            <TranscriptTextArea { ...{ ...docObject, transcriptValue, aligningInProgress } } />
            <div className="bottom-wrapper">
                <button className="basic-btn" disabled={ aligningInProgress || !readyForTranscript || !foundGentle } onClick={ setTranscript }>
                    { buttonText }
                </button>
                <ProgressBar { ...docObject } />
            </div>
        </>
    );
}

function TranscriptTextArea({ path, transcriptValue, aligningInProgress }) {

    const [ textareaStr, setTextareaStr ] = useState(transcriptValue.current);

    useEffect(() => {
        transcriptValue.current = textareaStr;
    }, [ textareaStr ]);

    return (
        <>
        { 
            path != undefined 
                && <textarea 
                    value={ textareaStr } 
                    onChange={ ev => setTextareaStr(ev.target.value) }
                    className="ptext" 
                    placeholder="Enter Gentle Transcript here..." 
                    disabled={ aligningInProgress }
                    rows="5" onClick={ stopProp }></textarea>
        }
        </>
    );
}

function ProgressBar({ upload_status, path, align_px, align }) {
    return (
        <>
            { upload_status !== undefined && path == undefined && <progress max="100" value={ "" + Math.floor(100 * upload_status) }/> }
            { align_px !== undefined && align == undefined && <progress max="100" value={ "" + Math.floor(100 * align_px) }/> }
        </>
    )
}


export default DocContentUnaligned;