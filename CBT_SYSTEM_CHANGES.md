# Computer Based Testing System Changes

The following changes have been made to integrate CBT functionality:

## Database Schema Changes

### New Models Added:

1. **Exam**

   - Linked to marking scheme components
   - Configurable start/end dates
   - School & class specific
   - Full audit trail

2. **Paper**

   - Subject-specific exam papers
   - Configurable settings (retries, duration)
   - Question randomization options
   - Result visibility settings

3. **Question**

   - Multiple question types support
   - Rich content with explanations
   - Topic tagging system
   - Difficulty levels

4. **QuestionPaper**

   - Links questions to papers
   - Manages question order
   - Score allocation per question

5. **StudentResponse**
   - Records student answers
   - Tracks attempts and timing
   - Support for partial grading
   - Auto-grading capability

### School Model Extensions:

- Added CBT configuration options
- Controls for exam settings
- Maximum papers and retries settings

## API Changes

### New Endpoints:

1. **Exam Management**

   ```
   POST /api/cbt/exams
   GET /api/cbt/exams
   GET /api/cbt/exams/:id
   PATCH /api/cbt/exams/:id
   DELETE /api/cbt/exams/:id
   ```

2. **Paper Management**

   ```
   POST /api/cbt/papers
   GET /api/cbt/papers
   GET /api/cbt/papers/:id
   PATCH /api/cbt/papers/:id
   DELETE /api/cbt/papers/:id
   ```

3. **Question Management**

   ```
   POST /api/cbt/questions
   GET /api/cbt/questions
   GET /api/cbt/questions/:id
   PATCH /api/cbt/questions/:id
   DELETE /api/cbt/questions/:id
   ```

4. **Student Response Management**
   ```
   POST /api/cbt/responses
   GET /api/cbt/responses
   GET /api/cbt/responses/:id
   PATCH /api/cbt/responses/:id
   ```

## Integration Points

1. **Marking Scheme Integration**

   - Exams can be linked to marking scheme components
   - Scores automatically flow into the grading system
   - Support for weighted scoring

2. **Student Records Integration**

   - Results feed directly into student records
   - Automatic grade calculation
   - Performance tracking across attempts

3. **Academic Session Integration**
   - Exams tied to academic sessions
   - Term-specific configurations
   - Historical record preservation

## Database Migration Notes

1. Run initial migration:

   ```bash
   npx prisma migrate dev --name add_cbt_system
   ```

2. Verify table creation:

   ```sql
   SHOW TABLES LIKE 'exams';
   SHOW TABLES LIKE 'papers';
   SHOW TABLES LIKE 'questions';
   SHOW TABLES LIKE 'question_papers';
   SHOW TABLES LIKE 'student_responses';
   ```

3. Add initial data:
   ```bash
   npx prisma db seed
   ```

## Security Considerations

1. **Access Control**

   - Role-based access for exam creation
   - Student access restrictions
   - Time-based access controls

2. **Data Protection**
   - Answer encryption
   - Session management
   - Audit trail requirements

## Testing Requirements

1. **Unit Tests**

   - Model validations
   - Business logic
   - Integration points

2. **Integration Tests**

   - API endpoints
   - Database operations
   - Score calculations

3. **End-to-End Tests**
   - Student exam flow
   - Teacher grading flow
   - Report generation
