/**
 * Ops Local Core API Library
 * Centralizes all data fetching and "unwrapping" logic to prevent legacy JSON format errors.
 */

(function () {
    const API_BASE = '/api';

    /**
     * Helper to unwrap "value/Count" wrapper from PowerShell 5.1
     * @param {any} data 
     * @returns {Array} Clean array of items
     */
    function normalizeData(data) {
        if (!data) return [];

        // 1. If it has a .value property that is an array, take it (PowerShell wrapper)
        if (data.value && Array.isArray(data.value)) {
            return data.value;
        }

        // 2. If it is already an array, return it
        if (Array.isArray(data)) {
            return data;
        }

        // 3. If it's a single object (and not null), wrap it in an array
        return [data];
    }

    window.opsApi = {
        /**
         * Get data from a JSON file.
         * Automatically normalizes the result into an array.
         * @param {string} filename e.g. "tasks.json"
         * @returns {Promise<Array>}
         */
        getAll: async function (filename) {
            try {
                const url = `${API_BASE}/data?file=${filename}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
                }
                const raw = await response.json();
                return normalizeData(raw);
            } catch (error) {
                console.error(`[OpsApi] Get Error (${filename}):`, error);
                // Return empty array on error to prevent UI crash, but log it
                return [];
            }
        },

        /**
         * Save data to a JSON file.
         * Ensures data is an array before sending.
         * @param {string} filename e.g. "tasks.json"
         * @param {Array} dataList Array of items to save
         * @returns {Promise<boolean>} Success status
         */
        save: async function (filename, dataList) {
            try {
                // Ensure we are saving an array
                const payload = Array.isArray(dataList) ? dataList : [dataList];

                const url = `${API_BASE}/data?file=${filename}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Failed to save ${filename}: ${response.status}`);
                }
                return true;
            } catch (error) {
                console.error(`[OpsApi] Save Error (${filename}):`, error);
                alert("Lỗi khi lưu dữ liệu! Vui lòng kiểm tra console.");
                return false;
            }
        },

        /**
         * Launch a local resource
         * @param {string} path Absolute path to open
         */
        launch: async function (path) {
            try {
                const response = await fetch(`${API_BASE}/launch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: path })
                });

                if (!response.ok) {
                    const err = await response.json();
                    alert("Lỗi khi mở tài nguyên: " + (err.error ? err.error.message : "Không xác định"));
                    return;
                }

                const result = await response.json();
                if (result.alreadyOpen) {
                    alert("Tài nguyên này đang được mở sẵn.");
                }
            } catch (error) {
                console.error("[OpsApi] Launch Error:", error);
            }
        },

        /**
         * Execute automation actions
         * @param {Array} actions List of action objects
         */
        runAutomation: async function (actions) {
            try {
                const response = await fetch(`${API_BASE}/automation/run`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actions: actions })
                });

                const result = await response.json();
                if (result.ok) {
                    alert("Đã thực thi xong kịch bản!");
                    return true;
                } else {
                    alert("Lỗi thực thi: " + JSON.stringify(result.error));
                    return false;
                }
            } catch (e) {
                alert("Lỗi kết nối server: " + e.message);
                return false;
            }
        }
    };
})();
