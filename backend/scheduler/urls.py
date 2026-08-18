from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()

router.register(
    r"schedules",
    views.ScheduleViewSet,
    basename="schedule",
)

router.register(
    r"tasks",
    views.TaskViewSet,
    basename="task",
)


urlpatterns = [
    path(
        "health/",
        views.health_check,
        name="health_check",
    ),
    path(
        "register/",
        views.register,
        name="register",
    ),
    path("", include(router.urls)),
]