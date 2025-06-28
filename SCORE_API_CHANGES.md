# Score API Changes - Behavioral & Attendance Support

## Overview

The score submission and retrieval APIs have been enhanced to support:

- **Behavioral ratings**: punctuality, attentiveness, leadership skills, neatness
- **Attendance tracking**: automatic computation and storage of attendance records
- **Comments**: class teacher and principal comments

## Schema Changes

### New Enum: BehavioralRating

```prisma
enum BehavioralRating {
  excellent
  very_good
  good
  fair
  poor
}
```

### Updated StudentScoreAssignment Model

Added optional fields:

- `punctuality: BehavioralRating?`
- `attentiveness: BehavioralRating?`
- `leadershipSkills: BehavioralRating?`
- `neatness: BehavioralRating?`
- `attendanceTotal: Int?`
- `attendancePresent: Int?`
- `attendanceAbsent: Int?`
- `classTeacherComment: String?`
- `principalComment: String?`

## API Usage Examples

### 1. Score Submission with Behavioral Data

```json
POST /scores/save
{
  "sessionId": "session-uuid",
  "classId": "class-uuid",
  "classArmId": "class-arm-uuid",
  "termId": "term-definition-uuid",
  "subjectId": "subject-uuid",
  "scores": [
    {
      "studentId": "student-uuid",
      "componentId": "component-uuid",
      "score": 85,
      "maxScore": 100,
      "type": "EXAM"
    }
  ],
  "additionalData": [
    {
      "studentId": "student-uuid",

      // Optional behavioral ratings (sent as lowercase)
      "punctuality": "excellent",
      "attentiveness": "very_good",
      "leadershipSkills": "good",
      "neatness": "excellent",

      // Optional attendance data (will be auto-computed if not provided)
      "attendanceTotal": 20,
      "attendancePresent": 18,
      "attendanceAbsent": 2,

      // Optional comments
      "classTeacherComment": "Excellent performance, keep it up!",
      "principalComment": "Outstanding student with great potential."
    }
  ]
}
```

### 2. Score Retrieval Response

```json
GET /scores/fetch?sessionId=...&classId=...&classArmId=...&termId=...

{
  "statusCode": 200,
  "message": "Scores retrieved successfully",
  "data": {
    "totalRecords": 1,
    "scores": [
      {
        "id": "score-uuid",
        "studentId": "student-uuid",
        "subjectId": "subject-uuid",
        "score": 85,
        "maxScore": 100,
        "type": "EXAM",
        "student": {
          "id": "student-uuid",
          "regNo": "STU001",
          "fullName": "John Doe"
        },
        "subject": {
          "id": "subject-uuid",
          "name": "Mathematics",
          "code": "MATH"
        }
      }
    ],

    // Additional data separate from scores (only present if there's data)
    "additionalData": [
      {
        "studentId": "student-uuid",

        // Behavioral ratings
        "punctuality": "excellent",
        "attentiveness": "very_good",
        "leadershipSkills": "good",
        "neatness": "excellent",

        // Attendance data
        "attendanceTotal": 20,
        "attendancePresent": 18,
        "attendanceAbsent": 2,

        // Comments
        "classTeacherComment": "Excellent performance, keep it up!",
        "principalComment": "Outstanding student with great potential."
      }
    ]
  }
}
```

## Key Features

### 1. Separated Data Structure

- **Score data**: Kept in the main `scores` array (maintains backward compatibility)
- **Additional data**: Behavioral ratings, attendance, and comments are sent in a separate `additionalData` array
- **Response separation**: Additional data is returned in a separate `additionalData` array at the same level as scores (only included if data exists)
- **Easy frontend integration**: You can maintain your existing score submission and just add the optional `additionalData` array

### 2. Automatic Attendance Computation

- If attendance data is not provided in the additional data, the system automatically computes it
- Fetches all attendance records for the student in the specified session/term/class
- Counts present (including late) and absent records
- Stores the computed values for future reference

### 3. Behavioral Rating Validation

- Accepts lowercase values: `excellent`, `very_good`, `good`, `fair`, `poor`
- All behavioral fields are optional
- Stored as enum values in the database

### 4. Comments Support

- Both class teacher and principal comments are optional
- Stored as text fields to support longer comments
- Useful for comprehensive student evaluation and result generation

### 5. Backward Compatibility

- All new fields are optional, ensuring existing API calls continue to work
- Existing score submissions without additional data work normally
- New fields return as `null` or are omitted for scores that don't have this data
- The `additionalData` object is only included in responses if there's actual data

## Migration Applied

- Migration `20250626192851_add_behavioral_attendance_comments` has been applied
- Database schema is updated and ready for use
- Prisma client includes the new fields (after regeneration)
