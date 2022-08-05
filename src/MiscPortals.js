import React, { useContext } from 'react';
import { GutsContext } from './GutsContext';
import SettingsDialog from './portals/SettingsDialog';
import GentleWarning from './portals/GentleWarning';
import UploadArea from './portals/UploadArea';

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