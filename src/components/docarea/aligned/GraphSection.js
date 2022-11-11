import Graph from "./Graph";
import GraphEdge from "./GraphEdge";
import GraphDownloadButton from "./GraphDownloadButton";

function GraphSection(props) {

    let {
        id, title, selection, docReady,
    } = props;

    return (
        <section className="graph-section">
            <div id={id + '-detdiv'} className={"detail " + (docReady ? "loaded" : "")}>
                {docReady &&
                    <>
                        <GraphEdge />
                        <Graph {...props} />
                        <GraphDownloadButton id={id} title={title} selection={selection} />
                    </>}
                {!docReady && <div className="loading-placement">Loading... If this is taking too long, try reloading the webpage, turning off AdBlock, or reuploading this data file</div>}
            </div>
        </section>
    );
}

export default GraphSection;