import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from '../GutsContext';
import { RESOLVING } from '../utils/Utils';

function GentleWarning(props) {
    const { foundGentle, gentlePort } = useContext(GutsContext);
    const [ acknowledged, setAcknowledged ] = useState(false);
    
    useEffect(() => {
        if (foundGentle === RESOLVING)
            setAcknowledged(false);
    }, [foundGentle]);

    return createPortal(
        (foundGentle === false && !acknowledged) &&
            <>
                <p>
                    <em>Warning:</em>
                    <br />
                    No Gentle found on port <b id="gentle-port-text">{ gentlePort }</b>! 
                    You can change this port in <i>Settings</i>&nbsp;(<img src="settings.svg" className="intext-icon" alt="Settings icon" />). 
                    In the meantime, you may examine existing documents and upload audio files but you will not be able to align any transcripts!
                </p>
                <button id="exit-gentle-warning" className="cancel-btn" title="Dismiss warning" onClick={ () => setAcknowledged(true) }>&times;</button>
            </>,
        document.getElementById("gentle-warning")
    );
}

export default GentleWarning;