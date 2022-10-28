import { useContext, useEffect, useRef, useState } from "react";
import { GutsContext } from '../GutsContext';
import { postGetWindowedData } from "../utils/Queries";
import { displaySnackbarAlert, elemClassAdd, elemClassRemove, filterStats, getExt, measuresToTabSepStr, prevDefCb, rearrangeObjectProps, stripExt, useProsodicMeasures, WINDOWED_PARAMS } from "../utils/Utils"

function DocCardHeader({ doc, onDragStart, pmContext }) {
    return (
        <div className="docbar">
            <img src="tictactoe.svg" alt="drag indicator" title="Drag to change order of document" 
                onMouseDown={ () => onDragStart(doc.id) } draggable={ false } />
            <div className="doc-name">{ doc.title }</div>
            <DocOptions { ...{ ...doc, pmContext } } />
        </div>
    )
}

function DocOptions({ id, title, transcript: transcriptLink, csv: csvLink, align: alignLink, pmContext }) {

    const { updateDoc, deleteDoc } = useContext(GutsContext);

    const { 
        fullTSProsMeasuresReady,
        fullTSProsMeasures,
        selectionProsMeasuresReady,
        selectionProsMeasures,
     } = useProsodicMeasures({ id, ...pmContext });

    const filenameBase = stripExt(title);

    const downloadVoxitCSV = () => {
        if (!fullTSProsMeasuresReady || !selectionProsMeasuresReady) return;

        let csvContent = measuresToTabSepStr(fullTSProsMeasures, selectionProsMeasures);
        csvContent = csvContent.replace(/\t/g, ',')
    
        let out_filename = filenameBase + '-voxitcsv.csv';
    
        // eslint-disable-next-line no-undef
        saveAs(new Blob([csvContent]), out_filename);
    }

    const downloadWindowedData = async () => {
        if (!fullTSProsMeasuresReady) return;

        displaySnackbarAlert("Calculating... This might take a few minutes. DO NOT reload or change settings!", 4000);
        
        const { measure: measureJSON } = await postGetWindowedData({
            id: id,
            params: WINDOWED_PARAMS,
        });
        
        let maxSegments = -1;
        
        Object.values(measureJSON)
            .forEach(measures => maxSegments = Math.max(maxSegments, measures.length));

        let content = '';

        let header = 'measure_label,window_len,full_transcript';
        for (let i = 0; i < maxSegments; i++)
            header += `,seg_${ i + 1 }`;

        content += header;
        content += ",INFO: For the prosodic measure data the default window or audio sample length is 20 seconds. Rigorous testing showed that a window/audio sample of 20 seconds is ideal for its consistency in matching the prosodic measures of the entire audio length."
        content += '\n';

        let filteredKeys = filterStats(fullTSProsMeasures);

        filteredKeys.forEach(label => {
            let measures = measureJSON[label];
            content += `${ label },${ WINDOWED_PARAMS[label] },${ fullTSProsMeasures[label] }`;
            measures.forEach(measure => content += `,${ measure }`);
            for (let i = 0; i < maxSegments - measures.length - 1; i++)
                content += ','
            content += '\n';
        })

        // eslint-disable-next-line no-undef
        saveAs(new Blob([content]), stripExt(title) + '-windowed.csv');
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