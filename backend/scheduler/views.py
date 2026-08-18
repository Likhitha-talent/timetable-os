from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Schedule, Task
from .serializers import (
    RegisterSerializer,
    ScheduleSerializer,
    TaskSerializer,
)


MAX_DAY_MINUTES = 24 * 60


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED,
    )


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Schedule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def today(self, request):
        schedule = Schedule.objects.filter(
            user=request.user,
            date=timezone.localdate(),
        ).first()

        if not schedule:
            return Response(
                {"detail": "No schedule for today yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            ScheduleSerializer(schedule).data
        )

    @action(detail=True, methods=["post"])
    def bulk_add_tasks(self, request, pk=None):
        schedule = self.get_object()
        incoming = request.data.get("tasks", [])

        if not isinstance(incoming, list):
            return Response(
                {"tasks": "Must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_total = (
            schedule.tasks.aggregate(
                total=Sum("duration_minutes")
            )["total"]
            or 0
        )

        incoming_total = 0

        for task_data in incoming:
            duration = task_data.get("duration_minutes")

            if not isinstance(duration, int) or isinstance(duration, bool):
                return Response(
                    {
                        "tasks": (
                            "Each task must contain "
                            "duration_minutes as an integer."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if duration <= 0:
                return Response(
                    {
                        "tasks": (
                            "duration_minutes must be "
                            "greater than 0."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            incoming_total += duration

        projected_total = existing_total + incoming_total

        if projected_total > MAX_DAY_MINUTES:
            overflow = projected_total - MAX_DAY_MINUTES

            return Response(
                {
                    "error": "overflow",
                    "existing_minutes": existing_total,
                    "incoming_minutes": incoming_total,
                    "projected_minutes": projected_total,
                    "limit_minutes": MAX_DAY_MINUTES,
                    "overflow_minutes": overflow,
                    "message": (
                        f"Adding these tasks totals "
                        f"{projected_total} min, "
                        f"{overflow} min over the 24h limit. "
                        f"Trim, reschedule, or drop something first."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        start_order = schedule.tasks.count()
        created = []

        for index, task_data in enumerate(incoming):
            serializer = TaskSerializer(
                data={
                    "schedule": schedule.id,
                    "name": task_data.get(
                        "name",
                        "Untitled task",
                    ),
                    "description": task_data.get(
                        "description",
                        "",
                    ),
                    "duration_minutes": task_data[
                        "duration_minutes"
                    ],
                    "priority": task_data.get(
                        "priority",
                        2,
                    ),
                    "order": start_order + index,
                }
            )

            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())

        return Response(
            TaskSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            schedule__user=self.request.user
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        task = self.get_object()

        task.status = "active"
        task.started_at = timezone.now()
        task.save()

        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()

        task.status = "done"
        task.completed_at = timezone.now()

        if task.started_at:
            elapsed = (
                task.completed_at - task.started_at
            ).total_seconds() / 60

            task.actual_minutes_spent = round(elapsed)

        task.save()

        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["post"])
    def extend(self, request, pk=None):
        task = self.get_object()

        try:
            minutes = int(
                request.data.get("minutes", 15)
            )
        except (TypeError, ValueError):
            return Response(
                {"minutes": "Must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if minutes <= 0:
            return Response(
                {"minutes": "Must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TaskSerializer(
            task,
            data={
                "duration_minutes": (
                    task.duration_minutes + minutes
                )
            },
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        order_list = request.data.get("order", [])

        if not isinstance(order_list, list):
            return Response(
                {"order": "Must be a list of task IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for index, task_id in enumerate(order_list):
            Task.objects.filter(
                id=task_id,
                schedule__user=request.user,
            ).update(order=index)

        return Response({"detail": "reordered"})