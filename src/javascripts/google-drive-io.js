/**
 * Created by jsandoe on 3/13/15.
 */
function GoogleDriveIO () {
  var CLIENT_ID = '1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com',
    SCOPES = 'https://www.googleapis.com/auth/drive';

  this.authorize = function (immediate, callback) {
    var isImmediate = immediate || false;

    gapi.auth.authorize({ 'client_id': CLIENT_ID, 'scope': SCOPES,
      'immediate': isImmediate }, callback);
  };

  /**
   * Check if the current user has authorized the application.
   *
   * @param {object} fileSpec { fileName, mimeType}
   * @param {string} contents
   *
   */
  this.upload = function (fileSpec, contents) {

    /**
     * Called when authorization server replies.
     *
     * @param {Object} authResult Authorization result.
     */
    function handleAuthResult(authResult) {
      if (authResult && !authResult.error) {
        gapi.client.load('drive', 'v2', function () {
          sendFile(fileSpec);
        });
      } else {
        console.log('No authorization. Upload failed for file: ' + fileSpec.fileName);
      }
    }

    /**
     * Creates the body of a multipart post.
     *
     * @param {array} parts of {fileType: "mime-type", encoding: "base64"(optional),
         * message: "content"}
     * @param {string} boundary Multipart boundary. Must be unique.
     */
    function makeMultipartBody(parts, boundary) {
      var delimiter = "\r\n--" + boundary + "\r\n",
        close_delim = "\r\n--" + boundary + "--",
        results = "";

      parts.forEach(function (part) {
        results += delimiter + 'Content-Type: ' + part.fileType;
        if (part.encoding) {
          results += 'Content-Transfer-Encoding: ' + part.encoding;
        }
        results += "\r\n\r\n";
        results += part.message;
      });
      results += close_delim;
      return results;
    }

    /**
     * Send a new file to Google Drive.
     *
     * @param {object} fileSpec
     * @param {Function} callback Function to call when the request is complete.
     */
    function sendFile(fileSpec, callback) {
      var boundary = '-------314159265358979323846',
        contentType = fileSpec.mimeType || 'application/octet-stream',
        metadata = {
          'title': fileSpec.fileName, 'mimeType': contentType
        },
        base64Data = btoa(contents),
        multipartRequestBody = makeMultipartBody([{
            fileType: contentType,
            message: JSON.stringify(metadata)
          }, {
            fileType: 'application/json',
            message: contents
          }], boundary
        ),
        request = gapi.client.request({
          'path': '/upload/drive/v2/files',
          'method': 'POST',
          'params': {'uploadType': 'multipart'},
          'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody
        });

      if (!callback) {
        callback = function (file) {
          console.log(file)
        };
      }
      request.execute(callback);
    }

    gapi.auth.authorize({ 'client_id': CLIENT_ID, 'scope': SCOPES,
      'immediate': true }, handleAuthResult);
  }
}

module.exports = GoogleDriveIO;