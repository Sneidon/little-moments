import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createClassChangeReportForChild, handleChildClassAssignmentChange, normalizeChildClassId, notifyTeacherChildJoinedClass } from '../lib/childClassChange';
import { childEnrollmentIsActive, isoNow } from '../lib/util';

/** Left-school children must not keep a classId or they still match class roster queries. */
export const onSchoolChildUpdatedClearClassIfInactive = functions.firestore
  .document('schools/{schoolId}/children/{childId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data() as { isActive?: boolean; classId?: string | null };
    if (childEnrollmentIsActive(after)) return null;
    const classId = after.classId;
    if (classId == null || classId === '') return null;
    await change.after.ref.update({ classId: null, updatedAt: isoNow() });
    functions.logger.info('onSchoolChildUpdatedClearClassIfInactive: cleared class', {
      schoolId: context.params.schoolId,
      childId: context.params.childId,
      previousClassId: classId,
    });
    return null;
  });

export const onSchoolChildClassAssignmentChanged = functions.firestore
  .document('schools/{schoolId}/children/{childId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as { isActive?: boolean; classId?: string | null };
    const after = change.after.data() as { isActive?: boolean; classId?: string | null };
    const db = admin.firestore();
    try {
      await handleChildClassAssignmentChange(
        db,
        context.params.schoolId,
        context.params.childId,
        before,
        after
      );
    } catch (e) {
      functions.logger.error('onSchoolChildClassAssignmentChanged failed', {
        schoolId: context.params.schoolId,
        childId: context.params.childId,
        error: e,
      });
    }
    return null;
  });

export const onSchoolChildCreatedWithClass = functions.firestore
  .document('schools/{schoolId}/children/{childId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() as { isActive?: boolean; classId?: string | null };
    const afterClassId = normalizeChildClassId(data.classId);
    if (!afterClassId || !childEnrollmentIsActive(data)) return null;
    const db = admin.firestore();
    try {
      await createClassChangeReportForChild({
        db,
        schoolId: context.params.schoolId,
        childId: context.params.childId,
        beforeClassId: null,
        afterClassId,
      });
      await notifyTeacherChildJoinedClass({
        db,
        schoolId: context.params.schoolId,
        childId: context.params.childId,
        beforeClassId: null,
        afterClassId,
      });
    } catch (e) {
      functions.logger.error('onSchoolChildCreatedWithClass failed', {
        schoolId: context.params.schoolId,
        childId: context.params.childId,
        error: e,
      });
    }
    return null;
  });
