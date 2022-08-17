import { useContext } from "react";
import { GutsContext } from "../GutsContext";
import { stopProp } from "../utils/Utils";

function TranscriptInput({ path, docObject }) {

    const { foundGentle } = useContext(GutsContext);
    const readyForTranscript = () => path != undefined;

    const setTranscript = () => {
        console.log("TODO transcriptinput.js set transcript");
    }

    return (
        <>
            <TranscriptTextArea { ...docObject } />
            <div className="bottom-wrapper">
                <button className="basic-btn" disabled={ !readyForTranscript() || !foundGentle } onClick={ setTranscript }>
                    { readyForTranscript() ? "set transcript" : "uploading..." }
                </button>
                <ProgressBar { ...docObject } />
            </div>
        </>
    );
}

function TranscriptTextArea({ path }) {
    return (
        <>
        { path != undefined && <textarea className="ptext" placeholder="Enter Gentle Transcript here..." rows="5" onClick={ stopProp }></textarea> }
        </>
    );
}

function ProgressBar({ upload_status, path, align_px, align }) {
    return (
        <>
            { upload_status != undefined && path == undefined && <progress max="100" value={ "" + Math.floor(100 * upload_status) }/> }
            { align_px != undefined && align == undefined && <progress max="100" value={ "" + Math.floor(100 * align_px) }/> }
        </>
    )
}


export default TranscriptInput;