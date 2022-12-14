import { useContext, useEffect, useState } from "react";
import { GutsContext } from "context/GutsContext";
import useProsodicMeasures from "hooks/useProsodicMeasures";
import { displaySnackbarAlert, filterStats, LABEL_DESCRIPTIONS, LABEL_HEADERS, linkFragment, measuresToTabSepStr, splitString } from "utils/Utils";

function MeasuresTable(props) {

    const { id, docReady } = props;

    const { 
        fullTSProsMeasuresReady, fullTSProsMeasures,
        selectionProsMeasures,
     } = useProsodicMeasures(props);
    const { calcIntense } = useContext(GutsContext);
    const [ copyAction, setCopyAction ] = useState();

    useEffect(() => {
        setCopyAction(() => (() => {      
            let cbContent = measuresToTabSepStr(fullTSProsMeasures, selectionProsMeasures);      
            navigator.clipboard.writeText(cbContent);
            displaySnackbarAlert("Copied!");
        }));
    }, [ selectionProsMeasures ])

    const invalidData = fullTSProsMeasuresReady && (
        calcIntense && !("Dynamism" in fullTSProsMeasures)
    );

    if (invalidData) {
        console.log("Outdated full_ts found, standby waiting for updated data")
        // don't have to do anything here, SettingsDialog will take care of clearing query cache on settings change
    }

    const tableNotReady = !docReady || !fullTSProsMeasuresReady || invalidData;
    
    return (
        <div className="table-wrapper">
            {
                tableNotReady
                    ? <UnloadedTable />
                    : <LoadedTable { ...props }/>
            }
            {
                tableNotReady
                    && <LoadingMessage calcIntense={ calcIntense } />
            }
            {
                !tableNotReady
                    && <CopyButton id={ id } copyAction={ copyAction } />
            }
        </div>

    );
}

function CopyButton({ id, copyAction }) {

    return (
        <button onClick={ copyAction } className="copy-btn" id={ id + '-copy-btn' }>Copy to Clipboard</button>
    );
}

function LoadedTable(props) {
    const { fullTSProsMeasures, selectionProsMeasuresReady, selectionProsMeasures } = useProsodicMeasures(props);

    const measureKeys = filterStats(fullTSProsMeasures);

    const getLinkAttrs = measureKey => {
        if (!LABEL_DESCRIPTIONS[measureKey]) return {};

        return {
            href: linkFragment('prosodic-measures.html', LABEL_HEADERS[measureKey], (measureKey.includes('Pause_Count') ? 'Gentle_Pause_Count' : measureKey)),
            target: '_blank',
            title: splitString(LABEL_DESCRIPTIONS[measureKey], 40, 4) + '\n(Click label for more information)',
        }
    }

    return (        
        <table className="stat-table drift-table">
            <tr className="stat-header">
                <th><a className="acsblty-skip" href={ `#${props.id}-copy-btn` }>Skip table headers</a></th>
                {
                    measureKeys.map(measureKey => (
                        <th key={ measureKey }>
                            <a { ...getLinkAttrs(measureKey) }>{ measureKey.replace(/_/g, ' ') }</a>
                        </th>
                    ))
                }
            </tr>
            <tr>
                <th>full recording duration</th>
                <TableDataRow labelsToPrint={ measureKeys } data={ fullTSProsMeasures } />
            </tr>
            <tr>
                <th>selection</th>
                <TableDataRow labelsToPrint={ measureKeys } data={ selectionProsMeasuresReady && selectionProsMeasures } />
            </tr>
        </table>
    );
}

function TableDataRow({ labelsToPrint, data }) {
    return (
        labelsToPrint.map(label => 
            <td key={ label }>
                {
                    data
                    ? (
                        isNaN(data[label])
                        ? data[label]
                        : Math.round(data[label] * 100) / 100
                    )
                    : "..."
                }
            </td>
        )
    )
}

function UnloadedTable() {
    return (        
        <table className="stat-table drift-table">
            <tr className="stat-header">
                <th></th>
            </tr>
            <tr>
                <th>full recording duration</th>
            </tr>
            <tr>
                <th>selection</th>
            </tr>
        </table>
    );
}

function LoadingMessage({ calcIntense }) {

    if (process.env.REACT_APP_BUILD === "web" || !calcIntense)
        return (
            <p className="table-loading">Loading... This may take a few minutes the first time you open this document.</p>
        );

    return (
        <p className="table-loading">
            Loading... This may take a few minutes the first time you open this document.
            You can speed this up by disabling intensive measures in 
            <i> Settings </i>
            <img src="settings.svg" className="intext-icon" />
        </p>
    )
}

export default MeasuresTable;