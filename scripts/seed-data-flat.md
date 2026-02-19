# Seed data – copy each block into Firestore

Replace placeholders with your real IDs from Firebase Auth / Firestore:
- `SUPER_ADMIN_UID`, `PRINCIPAL_UID`, `TEACHER_UID`, `PARENT_UID` = Auth user UIDs
- `SCHOOL_ID`, `CLASS_ID`, `CHILD_ID` = Firestore document IDs (create docs with auto-ID first, then use that ID in later docs)

---

## 1. Collection `users` – Document ID = `SUPER_ADMIN_UID`

```json
{
  "email": "superadmin@test.com",
  "displayName": "Super Admin",
  "role": "super_admin",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 2. Collection `users` – Document ID = `PRINCIPAL_UID`

```json
{
  "email": "principal@test.com",
  "displayName": "Principal User",
  "role": "principal",
  "schoolId": "SCHOOL_ID",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 3. Collection `users` – Document ID = `TEACHER_UID`

```json
{
  "email": "teacher@test.com",
  "displayName": "Ms. Sarah Johnson",
  "role": "teacher",
  "schoolId": "SCHOOL_ID",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 4. Collection `users` – Document ID = `PARENT_UID`

```json
{
  "email": "parent@test.com",
  "displayName": "Maria Rodriguez",
  "role": "parent",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 5. Collection `schools` – Document ID = (auto or e.g. `SCHOOL_ID`)

```json
{
  "name": "Sunshine Daycare",
  "address": "123 Main St",
  "contactEmail": "office@sunshine.com",
  "contactPhone": "+1 555 123 4567",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

Use this document’s ID as `SCHOOL_ID` in the next steps.

---

## 6. Subcollection `schools/SCHOOL_ID/classes` – Document ID = (auto or `CLASS_ID`)

```json
{
  "schoolId": "SCHOOL_ID",
  "name": "Rainbow Room",
  "assignedTeacherId": "TEACHER_UID",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

Use this document’s ID as `CLASS_ID` in the next step.

---

## 7. Subcollection `schools/SCHOOL_ID/children` – Document ID = (auto or `CHILD_ID`)

```json
{
  "schoolId": "SCHOOL_ID",
  "name": "Emma Rodriguez",
  "dateOfBirth": "2022-06-15",
  "allergies": ["Peanuts", "Tree nuts"],
  "emergencyContact": "+1 555 987 6543",
  "assignedTeacherId": "TEACHER_UID",
  "classId": "CLASS_ID",
  "parentIds": ["PARENT_UID"],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

In Firestore, `parentIds` is an **array** with one string element: the parent’s UID.  
Use this document’s ID as `CHILD_ID` if you add the report below.

---

## 8. (Optional) Subcollection `schools/SCHOOL_ID/children/CHILD_ID/reports` – Document ID = (auto)

```json
{
  "childId": "CHILD_ID",
  "schoolId": "SCHOOL_ID",
  "type": "meal",
  "mealType": "lunch",
  "reportedBy": "TEACHER_UID",
  "notes": "Ate well",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

---

Order: create **school** first → then **classes** and **children** under it → then **users** (with the school ID) → then optional **reports** under the child.
