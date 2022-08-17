import { useContext, useEffect, useRef, useState } from "react";
import { GutsContext } from '../GutsContext';
import { elemClassAdd, elemClassRemove, getExt, rearrangeObjectProps, stripExt } from "../utils/Utils"

function Topbar({ doc, onDragStart }) {

    return (
        <div className="docbar">
            <img src="tictactoe.svg" alt="drag indicator" title="Drag to change order of document" 
                onMouseDown={ () => onDragStart(doc.id) } draggable={ false } />
            <div className="doc-name">{ doc.title }</div>
            <Hamburger { ...doc } />
        </div>
    )
}

function Hamburger({ id, title, transcript: transcriptLink, csv: csvLink, align: alignLink }) {

    const { docs, setDocs, updateDoc, deleteDoc } = useContext(GutsContext);
    const filenameBase = useRef(stripExt(title));

    const downloadVoxitCSV = () => console.log("TODO hamburger download voxit csv");
    const downloadWindowedData = () => {
        console.log("TODO hamburger download windowed data");
        // eslint-disable-next-line no-undef
        little_alert("Calculating... This might take a few minutes. DO NOT reload or change settings!", 4000);
    }

    const options = () => ([
        {
            label: 'Close Document',
            addtClasses: 'min-btn',
            action: () => updateDoc(id, { opened: false }),
        },
        ...transcriptLink ? [{
            label: 'Download - Audio Transcript (.txt)',
            link: '/media/' + transcriptLink,
            filename: `${ filenameBase.current }-transcript.${ getExt(transcriptLink) }`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Voxit Data (.csv)',
            action: downloadVoxitCSV,
        }] : [],
        ...csvLink ? [{
            label: 'Download - Drift Data (.csv)',
            link: '/media/' + csvLink,
            filename: `${ filenameBase.current }-csv.${ getExt(csvLink) }`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Gentle Align (.json)',
            link: '/media/' + alignLink,
            filename: `${ filenameBase.current }-align.${ getExt(alignLink) }`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Windowed Voxit Data (.csv)',
            action: downloadWindowedData,
        }] : [],
        {
            label: 'Delete Audioclip',
            action: () => deleteDoc(id),
        },
    ])
    
    return (
        <button className="dl-btn">
            <img src="ellipsis.svg" alt="options indicator" />
            <ul className="dl-dropdown rightedge">
                {
                    options().map(option => (
                        <Option key={ option.label } { ...option } />
                    ))
                }
            </ul>
        </button>
    )
}

function Option({ label, action, link, filename, addtClasses }) {

    const toCb = _action => {
        return ev => {
            ev.preventDefault();
            _action();
        }
    }

    return (
        <li>
            {
                action ?
                <button className={ `action-btn ${ addtClasses || '' }` } onClick={ toCb(action) }>{ label }</button> :
                <a className={ `action-btn ${ addtClasses || '' }` } href={ link } target="_blank" download={ filename }>{ label }</a>
            }
        </li>
    )
}

export default Topbar;