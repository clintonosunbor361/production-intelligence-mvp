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

            const headers = rows[0].split(',').map(h => h.trim());
            const data = rows.slice(1).map(row => {
                const values = row.split(',').map(v => v.trim());
                // Simple zip 
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = values[i];
                });
                return obj;
            });

            onImport(data);

            // Reset input
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
