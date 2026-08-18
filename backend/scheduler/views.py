from django.utils import timezone

from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Schedule, Task
from .serializers import ScheduleSerializer, TaskSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Schedule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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
            minutes = int(request.data.get("minutes", 15))
        except (TypeError, ValueError):
            return Response(
                {"minutes": "Must be a valid integer."},
                status=400,
            )

        if minutes <= 0:
            return Response(
                {"minutes": "Must be greater than 0."},
                status=400,
            )

        serializer = TaskSerializer(
            task,
            data={
                "duration_minutes": task.duration_minutes + minutes
            },
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)