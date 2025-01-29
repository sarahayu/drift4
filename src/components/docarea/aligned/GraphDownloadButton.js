import { GutsContext } from "context/GutsContext";
import { useContext, useEffect, useRef } from "react";
import { downloadGraph } from "utils/Utils";

function GraphDownloadButton({ id, title, selection }) {

    // find dialog element so we can show it
    // TODO move this function upwards
    const {downloadGraphAsImage, setModalContext} = useContext(GutsContext);
    const downloadGraphDialogElem = useRef();


    // set up cog icon to display dialog on click
    useEffect(() => {
        downloadGraphDialogElem.current = document.getElementById("dl-graph-dialog");
    }, []);

    const handleDownloadGraph = () => {
        setModalContext({id, title, selection})
        downloadGraphDialogElem.current.showModal();
    }

    return (
        <button className="dl-graph-btn" onClick={ handleDownloadGraph }>
            <span>Download Graph</span>
            <img src="download-icon.svg"/>
        </button>
    );
}

export default GraphDownloadButton;