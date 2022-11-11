function ProgressBar({ upload_status, path, align_px, align }) {
    return (
        <>
            {upload_status !== undefined && path == undefined && <progress max="100" value={"" + Math.floor(100 * upload_status)} />}
            {align_px !== undefined && align == undefined && <progress max="100" value={"" + Math.floor(100 * align_px)} />}
        </>
    );
}

export default ProgressBar;