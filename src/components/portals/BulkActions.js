import Option from 'components/Option';
import { GutsContext } from 'context/GutsContext';
import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import { downloadAllDriftData, downloadAllVoxitData, downloadAllZipped } from "utils/Utils";

function BulkActions() {

    const { docs, deleteDoc } = useContext(GutsContext);

    const options = [
        {
            label: 'Download All - Audio Transcripts (.zip)',
            classes: 'action-btn',
            fn: () => downloadAllZipped('transcript', docs),
        },
        {
            label: 'Download All - Voxit Data (.csv)',
            classes: 'action-btn',
            fn: () => downloadAllVoxitData(),
        },
        {
            label: 'Download All - Drift Data (.csv)',
            classes: 'action-btn',
            fn: () => downloadAllDriftData(docs),
        },
        {
            label: 'Download All - Gentle Align (.zip)',
            classes: 'action-btn',
            fn: () => downloadAllZipped('align', docs),
        },
        ...process.env.REACT_APP_BUILD !== "web" ? [{
            label: 'Delete All Audio',
            classes: 'action-btn sep-before',
            fn: () => Object.keys(docs).forEach(deleteDoc),
        }] : [],
    ];

    return createPortal(
        <>       
            { options.map(option => <Option key={ option.label } {...option} />) }
        </>,
        document.getElementById('dl-all-area')
    );
}

export default BulkActions;