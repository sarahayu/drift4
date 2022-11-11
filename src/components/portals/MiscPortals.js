import React, { useContext } from 'react';
import { GutsContext } from 'context/GutsContext';
import SettingsDialog from './SettingsDialog';
import GentleWarning from './GentleWarning';
import UploadArea from './UploadArea';

function MiscPortals(props) {
    const { localhost } = useContext(GutsContext);
    
    return (
        <>
            { localhost && <SettingsDialog />  }
            { localhost && <GentleWarning /> }
            <UploadArea />
        </>
    );
}

export default MiscPortals;