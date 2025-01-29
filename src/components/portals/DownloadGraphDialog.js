import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from 'context/GutsContext';
import { postSettings } from 'utils/Queries';
import { displaySnackbarAlert, downloadGraph, RESOLVING } from 'utils/Utils';

function DownloadGraphDialog(props) {

    const {
        modalContext
    } = useContext(GutsContext);

    const downloadGraphDialogElem = useRef();
    const [size, setSize] = useState(1024);


    const hideDialog = () => downloadGraphDialogElem.current.close();
    const submitDialog = () => {
        downloadGraph({...modalContext, size});
        displaySnackbarAlert("Downloading image...");

        hideDialog()
    }            
    
    useEffect(() => {
        downloadGraphDialogElem.current = document.getElementById("dl-graph-dialog");
    }, []);

    return createPortal(
        <div className="dialog-container accent-card">
            <div className="dialog-header">
                <h3>Download Graph</h3>
                <button id="exit-download-graph-dialog" className="cancel-btn" onClick={hideDialog}>&times;</button>
            </div>
            <div className="dl-graph-modal-main">
                <div className='dl-graph-model-items'>
                    <input type="radio" name="size" id="size-1" value="size-1" checked={size === 512}
                        onChange={ev => void setSize(512)} />
                    <label htmlFor="size-1">small - 512px</label>
                </div>
                <div className='dl-graph-model-items'>
                    <input type="radio" name="size" id="size-2" value="size-2" checked={size === 1024}
                        onChange={ev => void setSize(1024)} />
                    <label htmlFor="size-2">medium - 1024px</label>
                </div>
                <div className='dl-graph-model-items'>
                    <input type="radio" name="size" id="size-4" value="size-4" checked={size === 2048}
                        onChange={ev => void setSize(2048)} />
                    <label htmlFor="size-4">large - 2048px</label>
                </div>
            </div>
            <button id="download-graph" className="basic-btn" onClick={submitDialog}>download png</button>
        </div>,
        document.getElementById('dl-graph-dialog')
    );
}

export default DownloadGraphDialog;