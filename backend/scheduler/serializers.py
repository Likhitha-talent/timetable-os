from django.db.models import Sum
from rest_framework import serializers

from .models import Schedule, Task


MAX_DAY_MINUTES = 24 * 60


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "schedule",
            "name",
            "description",
            "duration_minutes",
            "order",
            "status",
            "priority",
            "actual_minutes_spent",
            "started_at",
            "completed_at",
        ]
        read_only_fields = ["started_at", "completed_at"]

    def validate(self, data):
        schedule = data.get(
            "schedule",
            getattr(self.instance, "schedule", None),
        )

        new_duration = data.get(
            "duration_minutes",
            getattr(self.instance, "duration_minutes", 0),
        )

        existing_total = (
            schedule.tasks.exclude(
                pk=self.instance.pk if self.instance else None
            )
            .aggregate(total=Sum("duration_minutes"))["total"]
            or 0
        )

        projected_total = existing_total + new_duration

        if projected_total > MAX_DAY_MINUTES:
            overflow = projected_total - MAX_DAY_MINUTES

            raise serializers.ValidationError(
                f"This schedule would total {projected_total} minutes, "
                f"which is {overflow} minutes over the 24-hour limit "
                f"({MAX_DAY_MINUTES} min). Reduce, reschedule, or remove "
                f"a task first."
            )

        return data


class ScheduleSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    total_planned_minutes = serializers.ReadOnlyField()

    class Meta:
        model = Schedule
        fields = [
            "id",
            "user",
            "date",
            "status",
            "tasks",
            "total_planned_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]