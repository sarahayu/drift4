import { useContext } from "react";
import { GutsContext } from "context/GutsContext";
import useProsodicMeasures from "hooks/useProsodicMeasures";
import { downloadVoxitCSV, downloadWindowedData, getExt, prevDefCb, stripExt } from "utils/Utils";

function DocOptions({ id, title, transcript: transcriptLink, csv: csvLink, align: alignLink, pmContext }) {

    const { updateDoc, deleteDoc } = useContext(GutsContext);

    const {
        fullTSProsMeasuresReady, fullTSProsMeasures, selectionProsMeasuresReady, selectionProsMeasures,
    } = useProsodicMeasures({ id, ...pmContext });

    const filenameBase = stripExt(title);

    const options = [
        {
            label: 'Close Document',
            addtClasses: 'min-btn',
            action: () => updateDoc(id, { opened: false }),
        },
        ...transcriptLink ? [{
            label: 'Download - Audio Transcript (.txt)',
            link: '/media/' + transcriptLink,
            filename: `${filenameBase}-transcript.${getExt(transcriptLink)}`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Voxit Data (.csv)',
            action: () => downloadVoxitCSV({
                filenameBase, 
                fullTSProsMeasuresReady, fullTSProsMeasures, 
                selectionProsMeasuresReady, selectionProsMeasures
            }),
        }] : [],
        ...csvLink ? [{
            label: 'Download - Drift Data (.csv)',
            link: '/media/' + csvLink,
            filename: `${filenameBase}-csv.${getExt(csvLink)}`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Gentle Align (.json)',
            link: '/media/' + alignLink,
            filename: `${filenameBase}-align.${getExt(alignLink)}`,
        }] : [],
        ...alignLink ? [{
            label: 'Download - Windowed Voxit Data (.csv)',
            action: () => downloadWindowedData({ 
                filenameBase, id, 
                fullTSProsMeasuresReady, fullTSProsMeasures 
            }),
        }] : [],
        {
            label: 'Delete Audioclip',
            action: () => deleteDoc(id),
        },
    ];

    return (
        <button className="dl-btn">
            <img src="ellipsis.svg" alt="options indicator" />
            <ul className="dl-dropdown rightedge">
                {options.map(option => <Option key={ option.label } {...option} />)}
            </ul>
        </button>
    );
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

export default DocOptions;