import { useContext, useRef, useState } from "react";
import { GutsContext } from "context/GutsContext";
import { postTriggerAlignCreation, postTriggerCSVCreation, postTriggerMatCreation, postUpdateDoc } from "utils/Queries";
import { displaySnackbarAlert } from "utils/Utils";
import TranscriptTextArea from "./TranscriptTextArea";
import ProgressBar from "./ProgressBar";

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

    let btnDisabled = aligningInProgress || !readyForTranscript || (process.env.REACT_APP_BUILD === "bundle" && !foundGentle);

    return (
        <>
            <TranscriptTextArea { ...{ ...docObject, transcriptValue, aligningInProgress } } />
            <div className="bottom-wrapper">
                <button className="basic-btn" disabled={ btnDisabled } onClick={ setTranscript }>
                    { buttonText }
                </button>
                <ProgressBar { ...docObject } />
            </div>
        </>
    );
}

export default DocContentUnaligned;