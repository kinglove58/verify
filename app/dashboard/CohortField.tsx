"use client";
import { useState } from "react";

const cohorts = ["Cohort 01", "Cohort 02", "Cohort 03", "Cohort 04", "Cohort 05"];

export default function CohortField() {
  const [selection, setSelection] = useState("");
  const custom = selection === "other";
  return <div className="cohort-field">
    <label>Training cohort
      <select
        name={custom ? undefined : "cohort"}
        value={selection}
        onChange={event => setSelection(event.target.value)}
        required
      >
        <option value="" disabled>Select cohort</option>
        {cohorts.map(value => <option key={value} value={value}>{value}</option>)}
        <option value="other">Other — enter cohort name</option>
      </select>
    </label>
    {custom && <label style={{marginTop:12}}>Other cohort / batch
      <input
        type="text"
        name="cohort"
        minLength={2}
        maxLength={120}
        required
        autoFocus
        placeholder="e.g. Akure Cohort 06 / 2026"
      />
    </label>}
  </div>;
}
