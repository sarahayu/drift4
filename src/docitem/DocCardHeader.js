import { useContext, useEffect, useRef, useState } from "react";
import { GutsContext } from '../GutsContext';
import { displaySnackbarAlert, elemClassAdd, elemClassRemove, getExt, measuresToTabSepStr, prevDefCb, rearrangeObjectProps, stripExt, useProsodicMeasures } from "../utils/Utils"

function DocCardHeader({ doc, onDragStart, pmContext }) {
    return (
        <div className="docbar">
            <img src="tictactoe.svg" alt="drag indicator" title="Drag to change order of document" 
                onMouseDown={ () => onDragStart(doc.id) } draggable={ false } />
            <div className="doc-name">{ doc.title }</div>
            <DocOpts { ...{ ...doc, pmContext } } />
        </div>
    )
}

function DocOpts({ id, title, transcript: transcriptLink, csv: csvLink, align: alignLink, pmContext }) {

    const { updateDoc, deleteDoc } = useContext(GutsContext);

    const { 
        fullTSProsMeasures,
        selectionProsMeasures,
     } = useProsodicMeasures({ id, ...pmContext });

    const filenameBase = stripExt(title);

    const downloadVoxitCSV = () => {
        let csvContent = measuresToTabSepStr(fullTSProsMeasures, selectionProsMeasures);
        csvContent = csvContent.replace(/\t/g, ',')
    
        let out_filename = filenameBase + '-voxitcsv.csv';
    
        // eslint-disable-next-line no-undef
        saveAs(new Blob([csvContent]), out_filename);
    }
    const downloadWindowedData = () => {
        console.log("TODO hamburger download windowed data");
        displaySnackbarAlert("Calculating... This might take a few minutes. DO NOT reload or change settings!", 4000);
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
            filename: `${ filenameBase }-transcript.${ getExt(transcriptLink) }`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Voxit Data (.csv)',
            action: downloadVoxitCSV,
        }] : [],
        ...csvLink ? [{
            label: 'Download - Drift Data (.csv)',
            link: '/media/' + csvLink,
            filename: `${ filenameBase }-csv.${ getExt(csvLink) }`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Gentle Align (.json)',
            link: '/media/' + alignLink,
            filename: `${ filenameBase }-align.${ getExt(alignLink) }`,
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
                    options().map(option => <Option key={ option.label } { ...option } />)
                }
            </ul>
        </button>
    )
}

function Option({ label, action, link, filename, addtClasses }) {
    return (
        <li>
            {
                action ?
                <button className={ `action-btn ${ addtClasses || '' }` } onClick={ prevDefCb(action) }>{ label }</button> :
                <a className={ `action-btn ${ addtClasses || '' }` } href={ link } target="_blank" download={ filename }>{ label }</a>
            }
        </li>
    )
}

export default DocCardHeader;