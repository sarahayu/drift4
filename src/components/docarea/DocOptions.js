import Option from "components/Option";
import { GutsContext } from "context/GutsContext";
import useProsodicMeasures from "hooks/useProsodicMeasures";
import { useContext } from "react";
import { downloadVoxitCSV, downloadWindowedData, getExt, linkFragment, stripExt } from "utils/Utils";

function DocOptions({ id, title, transcript: transcriptLink, csv: csvLink, align: alignLink, pmContext }) {

    const { updateDoc, deleteDoc } = useContext(GutsContext);

    const {
        fullTSProsMeasuresReady, fullTSProsMeasures, selectionProsMeasuresReady, selectionProsMeasures,
    } = useProsodicMeasures({ id, ...pmContext });

    const filenameBase = stripExt(title);

    const options = [
        {
            label: 'Close Document',
            classes: 'action-btn min-btn',
            fn: () => updateDoc(id, { opened: false }),
        },

        ...transcriptLink ? [{
            label: 'Download - Audio Transcript (.txt)',
            classes: 'action-btn',
            link: '/media/' + transcriptLink,
            filename: `${filenameBase}-transcript.${getExt(transcriptLink)}`,
        }] : [],

        ...alignLink ? [{
            label: 'Download - Voxit Data (.csv)',
            classes: 'action-btn',
            fn: () => downloadVoxitCSV({
                filenameBase, 
                fullTSProsMeasuresReady, fullTSProsMeasures, 
                selectionProsMeasuresReady, selectionProsMeasures
            }),
        }] : [],

        ...csvLink ? [{
            label: 'Download - Drift Data (.csv)',
            classes: 'action-btn',
            link: '/media/' + csvLink,
            filename: `${filenameBase}-csv.${getExt(csvLink)}`,
        }] : [],

        ...alignLink ? [{
            label: 'Download - Gentle Align (.json)',
            classes: 'action-btn',
            link: '/media/' + alignLink,
            filename: `${filenameBase}-align.${getExt(alignLink)}`,
        }] : [],

        ...alignLink ? [{
            label: 'Download - Windowed Voxit Data (.csv)',
            classes: 'action-btn',
            fn: () => downloadWindowedData({ 
                filenameBase, id, 
                fullTSProsMeasuresReady, fullTSProsMeasures 
            }),
        }] : [],

        ...(transcriptLink || alignLink || csvLink) ? [{
            label: 'What do these mean?',
            classes: 'addt-info-btn hover-no-underline',
            link: linkFragment('prosodic-measures.html', 'Downloadable Data', 'downloadable-data'),
        }] : [],

        {
            label: 'Delete Audioclip',
            classes: 'action-btn sep-before',
            fn: () => deleteDoc(id),
        },
    ];

    return (
        <button className="dl-btn">
            <img src="ellipsis.svg" alt="options indicator" />
            <ul className="dl-dropdown rightedge">
                { options.map(option => <Option key={ option.label } {...option} />) }
            </ul>
        </button>
    );
}

export default DocOptions;