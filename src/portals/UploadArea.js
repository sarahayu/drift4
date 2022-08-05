import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// moved all event listener stuff here because file upload things depend on React App's got_files function, 
// and why not keep related event listener stuff here as well
function UploadArea(props) {

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

            console.log("TODO got files");
            // got_files(ev.dataTransfer.files);
        };
        $uplArea.onclick = () => {
            document.getElementById("upload-button").click()
        };

        document.getElementById("upload-button").onchange = (ev) => {
            console.log("TODO got files");
            // got_files(ev.target.files);
        };

        // eslint-disable-next-line no-restricted-globals
        let localhost = location.hostname === 'localhost';

        document.getElementById("upload-warning").innerText = 
            localhost ?
                "Only upload large files if your machine can handle it!"
                : "Please be courteous and only upload files less than 10 minutes!";
    }, []);

    return createPortal(
        null,
        document.getElementById('upload-button')
    );
}

export default UploadArea;