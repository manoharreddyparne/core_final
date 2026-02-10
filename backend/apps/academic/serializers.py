# courses/serializers.py
from rest_framework import serializers
from .models import Course, Batch
from users.serializers import UserSerializer
from users.models import User


class CourseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "name",
            "code",
            "description",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        """
        Automatically set the creator from request context if available.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class BatchSerializer(serializers.ModelSerializer):
    # Accept course ID on input but expand to nested Course on output
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    students = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.STUDENT),
        many=True,
        required=False,
    )

    class Meta:
        model = Batch
        fields = [
            "id",
            "course",
            "name",
            "start_date",
            "end_date",
            "students",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        """
        Customize output: include nested course + full student details.
        """
        rep = super().to_representation(instance)
        rep["course"] = CourseSerializer(instance.course).data
        rep["students"] = UserSerializer(instance.students.all(), many=True).data
        return rep
