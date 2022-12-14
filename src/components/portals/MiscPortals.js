import React, { useContext, useEffect } from 'react';
import { GutsContext } from 'context/GutsContext';
import SettingsDialog from './SettingsDialog';
import GentleWarning from './GentleWarning';
import UploadArea from './UploadArea';
import BulkActions from './BulkActions';

function MiscPortals(props) {

    let bundleBuild = process.env.REACT_APP_BUILD === "bundle";

    useEffect(() => {
        // these were from before I ported over to React, but I'll keep these here because they're useful for simple elements and I'm too lazy to refactor these
        if (bundleBuild)
            document.querySelectorAll("[webshow]").forEach(e => e.remove());
        else
            document.querySelectorAll("[localshow]").forEach(e => e.remove());
    }, []);
    
    return (
        <>
            { bundleBuild && <SettingsDialog />  }
            { bundleBuild && <GentleWarning /> }
            <UploadArea />
            <BulkActions />
        </>
    );
}

export default MiscPortals;