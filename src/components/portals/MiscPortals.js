import React, { useContext } from 'react';
import { GutsContext } from 'context/GutsContext';
import SettingsDialog from './SettingsDialog';
import GentleWarning from './GentleWarning';
import UploadArea from './UploadArea';
import BulkActions from './BulkActions';

function MiscPortals(props) {
    const { localhost } = useContext(GutsContext);
    
    return (
        <>
            { localhost && <SettingsDialog />  }
            { localhost && <GentleWarning /> }
            <UploadArea />
            <BulkActions />
        </>
    );
}

export default MiscPortals;