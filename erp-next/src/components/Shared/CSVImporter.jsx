import React, { useRef } from 'react';
import { Button } from '../UI/Button';
import { Upload } from 'lucide-react';

export function CSVImporter({ onImport, label = "Import CSV", variant = "secondary" }) {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').map(row => row.trim()).filter(row => row);

            if (rows.length < 2) {
                alert("CSV file seems empty or missing headers.");
                return;
            }

            // Better CSV parsing to handle quoted commas
            const parseCSVRow = (str) => {
                const result = [];
                let insideQuotes = false;
                let currentVal = '';
                for (let i = 0; i < str.length; i++) {
                    const char = str[i];
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        result.push(currentVal.trim());
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                result.push(currentVal.trim());
                return result;
            };

            const headers = parseCSVRow(rows[0]);
            const data = rows.slice(1).map(row => {
                const values = parseCSVRow(row);
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = values[i] || ''; // Handle missing values gracefully
                });
                return obj;
            });

            onImport(data);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
            <Button variant={variant} onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} className="mr-2" />
                {label}
            </Button>
        </div>
    );
}
