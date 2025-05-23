import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from 'context/GutsContext';
import { postCreateDoc, postTriggerHarvestCreation, postTriggerPitchCreation, postTriggerRMSCreation, postUpdateDoc } from 'utils/Queries';

function UploadArea() {

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
        
        $uplArea.onclick = () => {
            document.getElementById("upload-button").click()
        };

        document.getElementById("upload-warning").innerText = 
            process.env.REACT_APP_BUILD === "bundle" ?
                "Only upload large files if your machine can handle it!"
                : "Please be courteous and only upload files less than 10 minutes!";
    }, [])

    useEffect(() => {
        console.log("updating upload area")

        const $uplArea = document.getElementById("upload-area");

        $uplArea.ondrop = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            console.log("drop");
            ev.currentTarget.children[0].textContent = "UPLOAD FILE";

            handleFiles(ev.dataTransfer.files);
        };

        document.getElementById("upload-button").onchange = (ev) => {
            handleFiles(ev.target.files);
        };
        
    }, [ /*pushNewDoc, attachPutFile, updateDoc, calcIntense*/ ]); // TODO check if this makes a difference for multiple file uploads?

    return createPortal(
        null,
        document.getElementById('upload-button')
    );
}

export default UploadArea;