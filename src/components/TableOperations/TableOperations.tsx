import { useState } from 'react';
import './TableOperations.css';

interface TableOperationsProps {
  tableData: string[][];
  onApply: (sortedData: string[][]) => void;
  onClose: () => void;
}

export function TableOperations({ tableData, onApply, onClose }: TableOperationsProps) {
  const [sortBy, setSortBy] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterColumn, setFilterColumn] = useState<number | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const [previewData, setPreviewData] = useState<string[][]>(tableData);

  const headers = tableData[0] || [];
  const rows = tableData.slice(1);

  const applyOperations = () => {
    let result = [...rows];

    if (filterColumn !== null && filterValue) {
      result = result.filter((row) => {
        const cellValue = row[filterColumn] || '';
        return cellValue.toLowerCase().includes(filterValue.toLowerCase());
      });
    }

    if (sortBy !== null) {
      result.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';

        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }

        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    setPreviewData([headers, ...result]);
  };

  const handleApply = () => {
    onApply(previewData);
    onClose();
  };

  const handleReset = () => {
    setSortBy(null);
    setSortOrder('asc');
    setFilterColumn(null);
    setFilterValue('');
    setPreviewData(tableData);
  };

  const columnOptions = headers.map((header, index) => ({
    value: index,
    label: header || `Column ${index + 1}`,
  }));

  return (
    <div className="table-operations-overlay" onClick={onClose}>
      <div className="table-operations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="table-operations-header">
          <h2>Table Operations</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="operations-panel">
          <div className="operation-section">
            <h3>Sort</h3>
            <div className="operation-controls">
              <select
                value={sortBy ?? ''}
                onChange={(e) => setSortBy(e.target.value ? parseInt(e.target.value) : null)}
                className="column-select"
              >
                <option value="">No sort</option>
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {sortBy !== null && (
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="order-select"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              )}
            </div>
          </div>

          <div className="operation-section">
            <h3>Filter</h3>
            <div className="operation-controls">
              <select
                value={filterColumn ?? ''}
                onChange={(e) => setFilterColumn(e.target.value ? parseInt(e.target.value) : null)}
                className="column-select"
              >
                <option value="">No filter</option>
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {filterColumn !== null && (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Filter value"
                  className="filter-input"
                />
              )}
            </div>
          </div>

          <div className="operation-actions">
            <button className="preview-btn" onClick={applyOperations}>Preview</button>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
          </div>
        </div>

        <div className="preview-panel">
          <h3>Preview</h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {previewData[0]?.map((header, i) => (
                    <th key={i}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(1, 6).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 6 && (
              <div className="preview-more">
                ... {previewData.length - 6} more rows
              </div>
            )}
          </div>
        </div>

        <div className="table-operations-footer">
          <button className="apply-btn" onClick={handleApply}>Apply</button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}