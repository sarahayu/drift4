import { useEffect, useState } from "react";
import { stopProp } from "utils/Utils";

function TranscriptTextArea({ path, transcriptValue, aligningInProgress }) {

    const [textareaStr, setTextareaStr] = useState(transcriptValue.current);

    useEffect(() => {
        transcriptValue.current = textareaStr;
    }, [textareaStr]);

    return (
        <>
            {path != undefined
                && <textarea
                    value={textareaStr}
                    onChange={ev => setTextareaStr(ev.target.value)}
                    className="ptext"
                    placeholder="Enter Gentle Transcript here..."
                    disabled={aligningInProgress}
                    rows="5" onClick={stopProp}></textarea>}
        </>
    );
}

export default TranscriptTextArea;