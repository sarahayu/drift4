import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from '../GutsContext';
import { postCreateDoc, postTriggerHarvestCreation, postTriggerPitchCreation, postTriggerRMSCreation, postUpdateDoc } from '../utils/Queries';

// moved all event listener stuff here because file upload things depend on React App's got_files function, 
// and why not keep related event listener stuff here as well
function UploadArea(props) {

    const { 
        pushNewDoc, attachPutFile, updateDoc, calcIntense 
    } = useContext(GutsContext);

    const handleFiles = files => {
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
    
                (async function (file) {

                    let createResponse = await postCreateDoc({
                        title: file.name,
                        size: file.size,
                        date: new Date().getTime() / 1000
                    });
    
                    pushNewDoc(createResponse, { opened: true });

                    let putResponse = await attachPutFile(file, progress => {
                        updateDoc(createResponse.id, {
                            upload_status: progress / createResponse.size,
                        })
                    });

                    let updateResponse = await postUpdateDoc({ 
                        id: createResponse.id, 
                        path: putResponse.path 
                    });

                    updateDoc(createResponse.id, updateResponse.update);

                    // TODO do all this trigger stuff serverside?
                    postTriggerPitchCreation(createResponse.id)
                        .then(res => console.log("pitch returned", res));
                    postTriggerRMSCreation(createResponse.id)
                        .then(res => console.log("rms returned", res));

                    if (calcIntense)
                        postTriggerHarvestCreation(createResponse.id)
                            .then(res => console.log("harvest returned", res));    
    
                })(files[i]);
            }
        }
    }

    useEffect(() => {
        const $uplArea = document.getElementById("upload-area");

        $uplArea.ondragover = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            ev.dataTransfer.dropEffect = "copy";
            ev.currentTarget.children[0].textContent = "RELEASE FILE TO UPLOAD";
        };
        $uplArea.ondragleave = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            ev.currentTarget.children[0].textContent = "UPLOAD FILE";
        };
        $uplArea.ondrop = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            console.log("drop");
            ev.currentTarget.children[0].textContent = "UPLOAD FILE";

            handleFiles(ev.dataTransfer.files);
        };
        $uplArea.onclick = () => {
            document.getElementById("upload-button").click()
        };

        document.getElementById("upload-button").onchange = (ev) => {
            handleFiles(ev.target.files);
        };

        // eslint-disable-next-line no-restricted-globals
        let localhost = location.hostname === 'localhost';

        document.getElementById("upload-warning").innerText = 
            localhost ?
                "Only upload large files if your machine can handle it!"
                : "Please be courteous and only upload files less than 10 minutes!";
    }, [ calcIntense ]);

    return createPortal(
        null,
        document.getElementById('upload-button')
    );
}

export default UploadArea;